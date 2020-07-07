/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createStore, Store } from 'redux';
import { EndpointDocGenerator, TreeNode } from '../../../../common/endpoint/generate_data';
import { mock as mockResolverTree } from '../../models/resolver_tree';
import { dataReducer } from './reducer';
import * as selectors from './selectors';
import { DataState } from '../../types';
import { DataAction } from './action';
import { ResolverChildNode } from 'x-pack/plugins/security_solution/common/endpoint/types';

/**
 * Test the data reducer and selector.
 */
describe('Resolver Data Middleware', () => {
  let store: Store<DataState, DataAction>;
  

  beforeEach(() => {
    store = createStore(dataReducer, undefined);
  });

  describe('when data was received and the ancestry and children edges had cursors', () => {
    let firstChildNodeInTree: TreeNode;
    let statsForFirstChild: Record<string, number>;
    beforeEach(() => {
      const generator = new EndpointDocGenerator('seed');
      const baseTree = generator.generateTree({
        ancestors: 1,
        generations: 2,
        children: 3,
        percentWithRelated: 100,
        alwaysGenMaxChildrenPerNode: true,
      });
      const { children } = baseTree;
      firstChildNodeInTree = [...children.values()][0];
      statsForFirstChild = firstChildNodeInTree.relatedEvents.reduce((counts: Record<string, number>, relatedEvent)=>{
        for(const category of [relatedEvent.event.category].flat()){
          counts[category] = counts[category] ? counts[category] + 1 : 1;
        }
        return counts
      },{});
      const tree = mockResolverTree({
        events: baseTree.allEvents,
        cursors: {
          childrenNextChild: 'aValidChildCursor',
          ancestryNextAncestor: 'aValidAncestorCursor',
         
        },
        children: [...baseTree.children.values()].map((node)=>{
          const childNode: Partial<ResolverChildNode> = node;
          childNode.entityID = node.id;
          if(node.id === firstChildNodeInTree.id){
            //attach stats
            childNode.stats = {events: {total: 1, byCategory: statsForFirstChild}, totalAlerts: 0};
          }
          return childNode;
        }) as TreeNode[],
      });
      if (tree) {
        const action: DataAction = {
          type: 'serverReturnedResolverData',
          payload: {
            result: tree,
            databaseDocumentID: '',
          },
        };
        store.dispatch(action);
        const relatedAction: DataAction = {
          type: 'serverReturnedRelatedEventData',
          payload: {
            entityID: firstChildNodeInTree.id,
            events: firstChildNodeInTree.relatedEvents,
            nextEvent: null,
          },
        };
        store.dispatch(relatedAction);
      }
    });
    it('should indicate there are additional ancestor', () => {
      expect(selectors.hasMoreAncestors(store.getState())).toBe(true);
    });
    it('should indicate there are additional children', () => {
      expect(selectors.hasMoreChildren(store.getState())).toBe(true);
    });
    it('should have the correct related events', () => {
      const selectedEventsByEntityId = selectors.relatedEventsByEntityId(store.getState());
      const selectedEventsForFirstChildNode = selectedEventsByEntityId.get(firstChildNodeInTree.id)!
        .events;
      
      expect(selectedEventsForFirstChildNode).toBe(firstChildNodeInTree.relatedEvents);
    });
    it('should indicate the correct related event count for each category', ()=>{
      const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
      const displayCountsForCategory = selectedRelatedInfo.get(firstChildNodeInTree.id)?.getNumberActuallyDisplayedForCategory!;
      for(const typeCounted of Object.keys(statsForFirstChild)){
        expect(`${typeCounted}:${displayCountsForCategory(typeCounted)}`).toBe(`${typeCounted}:${statsForFirstChild[typeCounted]}`);
      }
    });
    it('should not indicate the limit has been exceeded when the actual count >= stats count', ()=>{
      const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
      const shouldShowLimit = selectedRelatedInfo.get(firstChildNodeInTree.id)?.shouldShowLimitForCategory!;
      for(const typeCounted of Object.keys(statsForFirstChild)){
        expect(shouldShowLimit(typeCounted)).toBe(false);
      }
    });
    it('should not indicate that there are any related events missing when the actual count >= stats count', ()=>{
      const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
      const notDisplayed = selectedRelatedInfo.get(firstChildNodeInTree.id)?.getNumberNotDisplayedForCategory!;
      for(const typeCounted of Object.keys(statsForFirstChild)){
        expect(notDisplayed(typeCounted)).toBe(0);
      }
    });
  });

  describe('when data was received and stats show more related than the API can provide', () => {
    let firstChildNodeInTree: TreeNode;
    let statsForFirstChild: Record<string, number>;
    let categoryToOverCount: string;
    beforeEach(() => {
      const generator = new EndpointDocGenerator('seed');
      const baseTree = generator.generateTree({
        ancestors: 1,
        generations: 2,
        children: 3,
        percentWithRelated: 100,
        alwaysGenMaxChildrenPerNode: true,
      });
      const { children } = baseTree;
      firstChildNodeInTree = [...children.values()][0];
      statsForFirstChild = firstChildNodeInTree.relatedEvents.reduce((counts: Record<string, number>, relatedEvent)=>{
        for(const category of [relatedEvent.event.category].flat()){
          if(!categoryToOverCount){
          
            categoryToOverCount = category;
          }
          counts[category] = counts[category] ? counts[category] + 1 : 1;
        }
        return counts
      },{});
      statsForFirstChild[categoryToOverCount] = statsForFirstChild[categoryToOverCount] + 1;
      
      const tree = mockResolverTree({
        events: baseTree.allEvents,
        cursors: {
          childrenNextChild: 'aValidChildCursor',
          ancestryNextAncestor: 'aValidAncestorCursor',
        },
        children: [...baseTree.children.values()].map((node)=>{
          const childNode: Partial<ResolverChildNode> = node;
          childNode.entityID = node.id;
          if(node.id === firstChildNodeInTree.id){
            //attach stats
            childNode.stats = {events: {total: 1, byCategory: statsForFirstChild}, totalAlerts: 0};
          }
          return childNode;
        }) as TreeNode[],
      });
      if (tree) {
        const action: DataAction = {
          type: 'serverReturnedResolverData',
          payload: {
            result: tree,
            databaseDocumentID: '',
          },
        };
        store.dispatch(action);
        const relatedAction: DataAction = {
          type: 'serverReturnedRelatedEventData',
          payload: {
            entityID: firstChildNodeInTree.id,
            events: firstChildNodeInTree.relatedEvents,
            nextEvent: 'aValidNextEventCursor',
          },
        };
        store.dispatch(relatedAction);
      }
    });
    it('should have the correct related events', () => {
      const selectedEventsByEntityId = selectors.relatedEventsByEntityId(store.getState());
      const selectedEventsForFirstChildNode = selectedEventsByEntityId.get(firstChildNodeInTree.id)!
        .events;
     
      expect(selectedEventsForFirstChildNode).toBe(firstChildNodeInTree.relatedEvents);
    });
    it('should indicate there are events missing when the actual count < stats count', ()=>{
      const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
      const numberNotDisplayed = selectedRelatedInfo.get(firstChildNodeInTree.id)?.getNumberNotDisplayedForCategory!;
      expect(numberNotDisplayed(categoryToOverCount)).toBe(1);
    });
    it('should indicate the limit has been exceeded when the actual count < stats count', ()=>{
      const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
      const shouldShowLimit = selectedRelatedInfo.get(firstChildNodeInTree.id)?.shouldShowLimitForCategory!;
      expect(shouldShowLimit(categoryToOverCount)).toBe(true);
    });
    it('should indicate that there are related events missing when the actual count < stats count', ()=>{
      const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
      const notDisplayed = selectedRelatedInfo.get(firstChildNodeInTree.id)?.getNumberNotDisplayedForCategory!;
      expect(notDisplayed(categoryToOverCount)).toBe(1);
    });
  });
});
