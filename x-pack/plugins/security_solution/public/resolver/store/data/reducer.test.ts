/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStore, Store } from 'redux';
import { RelatedEventCategory } from '../../../../common/endpoint/generate_data';
import { dataReducer } from './reducer';
import * as selectors from './selectors';
import { DataState, GeneratedTreeMetadata } from '../../types';
import { DataAction } from './action';
import { generateTreeWithDAL } from '../../data_access_layer/mocks/generator_tree';
import { endpointSourceSchema, winlogSourceSchema } from '../../mocks/tree_schema';
import { NewResolverTree, ResolverSchema } from '../../../../common/endpoint/types';
import { ancestorsWithAncestryField, descendantsLimit } from '../../models/resolver_tree';

type SourceAndSchemaFunction = () => { schema: ResolverSchema; dataSource: string };

/**
 * Test the data reducer and selector.
 */
describe('Resolver Data Middleware', () => {
  let store: Store<DataState, DataAction>;
  let dispatchTree: (tree: NewResolverTree, sourceAndSchema: SourceAndSchemaFunction) => void;

  beforeEach(() => {
    store = createStore(dataReducer, undefined);
    dispatchTree = (tree: NewResolverTree, sourceAndSchema: SourceAndSchemaFunction) => {
      const { schema, dataSource } = sourceAndSchema();
      const action: DataAction = {
        type: 'serverReturnedResolverData',
        payload: {
          result: tree,
          dataSource,
          schema,
          parameters: {
            databaseDocumentID: '',
            indices: [],
            filters: {},
          },
        },
      };
      store.dispatch(action);
    };
  });

  describe('when the generated tree has dimensions smaller than the limits sent to the server', () => {
    let generatedTreeMetadata: GeneratedTreeMetadata;
    beforeEach(() => {
      ({ metadata: generatedTreeMetadata } = generateTreeWithDAL({
        ancestors: 5,
        generations: 1,
        children: 5,
      }));
    });

    describe.each([
      ['endpoint', endpointSourceSchema],
      ['winlog', winlogSourceSchema],
    ])('when using %s schema to layout the graph', (name, schema) => {
      beforeEach(() => {
        dispatchTree(generatedTreeMetadata.formattedTree, schema);
      });
      it('should indicate that there are no more ancestors to retrieve', () => {
        expect(selectors.hasMoreAncestors(store.getState())).toBeFalsy();
      });

      it('should indicate that there are no more descendants to retrieve', () => {
        expect(selectors.hasMoreChildren(store.getState())).toBeFalsy();
      });

      it('should indicate that there were no more generations to retrieve', () => {
        expect(selectors.hasMoreGenerations(store.getState())).toBeFalsy();
      });
    });
  });

  describe('when the generated tree has dimensions larger than the limits sent to the server', () => {
    let generatedTreeMetadata: GeneratedTreeMetadata;
    beforeEach(() => {
      ({ metadata: generatedTreeMetadata } = generateTreeWithDAL({
        ancestors: ancestorsWithAncestryField + 10,
        // using the descendants limit here so we can avoid creating a massive tree but still
        // accurately get over the descendants limit as well
        generations: descendantsLimit + 10,
        children: 1,
      }));
    });

    describe('when using endpoint schema to layout the graph', () => {
      beforeEach(() => {
        dispatchTree(generatedTreeMetadata.formattedTree, endpointSourceSchema);
      });
      it('should indicate that there are more ancestors to retrieve', () => {
        expect(selectors.hasMoreAncestors(store.getState())).toBeTruthy();
      });

      it('should indicate that there are more descendants to retrieve', () => {
        expect(selectors.hasMoreChildren(store.getState())).toBeTruthy();
      });

      it('should indicate that there were no more generations to retrieve', () => {
        expect(selectors.hasMoreGenerations(store.getState())).toBeFalsy();
      });
    });

    describe('when using winlog schema to layout the graph', () => {
      beforeEach(() => {
        dispatchTree(generatedTreeMetadata.formattedTree, winlogSourceSchema);
      });
      it('should indicate that there are more ancestors to retrieve', () => {
        expect(selectors.hasMoreAncestors(store.getState())).toBeTruthy();
      });

      it('should indicate that there are more descendants to retrieve', () => {
        expect(selectors.hasMoreChildren(store.getState())).toBeTruthy();
      });

      it('should indicate that there were more generations to retrieve', () => {
        expect(selectors.hasMoreGenerations(store.getState())).toBeTruthy();
      });
    });
  });

  describe('when the generated tree has more children than the limit, less generations than the limit, and no ancestors', () => {
    let generatedTreeMetadata: GeneratedTreeMetadata;
    beforeEach(() => {
      ({ metadata: generatedTreeMetadata } = generateTreeWithDAL({
        ancestors: 0,
        generations: 1,
        children: descendantsLimit + 1,
      }));
    });

    describe('when using endpoint schema to layout the graph', () => {
      beforeEach(() => {
        dispatchTree(generatedTreeMetadata.formattedTree, endpointSourceSchema);
      });
      it('should indicate that there are no more ancestors to retrieve', () => {
        expect(selectors.hasMoreAncestors(store.getState())).toBeFalsy();
      });

      it('should indicate that there are more descendants to retrieve', () => {
        expect(selectors.hasMoreChildren(store.getState())).toBeTruthy();
      });

      it('should indicate that there were no more generations to retrieve', () => {
        expect(selectors.hasMoreGenerations(store.getState())).toBeFalsy();
      });
    });

    describe('when using winlog schema to layout the graph', () => {
      beforeEach(() => {
        dispatchTree(generatedTreeMetadata.formattedTree, winlogSourceSchema);
      });
      it('should indicate that there are no more ancestors to retrieve', () => {
        expect(selectors.hasMoreAncestors(store.getState())).toBeFalsy();
      });

      it('should indicate that there are more descendants to retrieve', () => {
        expect(selectors.hasMoreChildren(store.getState())).toBeTruthy();
      });

      it('should indicate that there were no more generations to retrieve', () => {
        expect(selectors.hasMoreGenerations(store.getState())).toBeFalsy();
      });
    });
  });

  describe('when data was received for a resolver tree', () => {
    let metadata: GeneratedTreeMetadata;
    beforeEach(() => {
      ({ metadata } = generateTreeWithDAL({
        generations: 1,
        children: 1,
        percentWithRelated: 100,
        relatedEvents: [
          {
            count: 5,
            category: RelatedEventCategory.Driver,
          },
        ],
      }));
      dispatchTree(metadata.formattedTree, endpointSourceSchema);
    });
    it('should have the correct total related events for a child node', () => {
      // get the first level of children, and there should only be a single child
      const childNode = Array.from(metadata.generatedTree.childrenLevels[0].values())[0];
      const total = selectors.relatedEventTotalCount(store.getState())(childNode.id);
      expect(total).toEqual(5);
    });
    it('should have the correct related events stats for a child node', () => {
      // get the first level of children, and there should only be a single child
      const childNode = Array.from(metadata.generatedTree.childrenLevels[0].values())[0];
      const stats = selectors.nodeStats(store.getState())(childNode.id);
      expect(stats).toEqual({
        total: 5,
        byCategory: {
          driver: 5,
        },
      });
    });
  });
});
