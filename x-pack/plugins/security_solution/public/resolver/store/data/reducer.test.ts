/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Store, AnyAction, Reducer } from 'redux';
import { createStore } from 'redux';
import { RelatedEventCategory } from '../../../../common/endpoint/generate_data';
import { dataReducer } from './reducer';
import * as selectors from './selectors';
import type { AnalyzerById, GeneratedTreeMetadata, TimeFilters } from '../../types';
import { generateTreeWithDAL } from '../../data_access_layer/mocks/generator_tree';
import { endpointSourceSchema, winlogSourceSchema } from '../../mocks/tree_schema';
import type { NewResolverTree, ResolverSchema } from '../../../../common/endpoint/types';
import { ancestorsWithAncestryField, descendantsLimit } from '../../models/resolver_tree';
import { EMPTY_RESOLVER } from '../helpers';
import { serverReturnedResolverData, userOverrodeDateRange } from './action';
import { appReceivedNewExternalProperties } from '../actions';

type SourceAndSchemaFunction = () => { schema: ResolverSchema; dataSource: string };

jest.mock('../../../common/utils/default_date_settings', () => {
  const original = jest.requireActual('../../../common/utils/default_date_settings');
  return {
    ...original,
    getTimeRangeSettings: () => ({ to: '', from: '' }),
  };
});

jest.mock('../../../common/utils/normalize_time_range', () => {
  const original = jest.requireActual('../../../common/utils/normalize_time_range');
  return {
    ...original,
    normalizeTimeRange: () => original.normalizeTimeRange(false),
  };
});

/**
 * Test the data reducer and selector.
 */
describe('Resolver Data Middleware', () => {
  let store: Store<AnalyzerById, AnyAction>;
  let dispatchTree: (
    tree: NewResolverTree,
    sourceAndSchema: SourceAndSchemaFunction,
    detectedBounds?: TimeFilters
  ) => void;
  const id = 'test-id';

  beforeEach(() => {
    const testReducer: Reducer<AnalyzerById, AnyAction> = (
      state = {
        [id]: EMPTY_RESOLVER,
      },
      action
    ): AnalyzerById => dataReducer(state, action);
    store = createStore(testReducer, undefined);
    dispatchTree = (
      tree: NewResolverTree,
      sourceAndSchema: SourceAndSchemaFunction,
      detectedBounds?: TimeFilters
    ) => {
      const { schema, dataSource } = sourceAndSchema();
      store.dispatch(
        serverReturnedResolverData({
          id,
          result: tree,
          dataSource,
          schema,
          parameters: {
            databaseDocumentID: '',
            indices: [],
            filters: {},
          },
          detectedBounds,
        })
      );
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
        expect(selectors.hasMoreAncestors(store.getState()[id].data)).toBeFalsy();
      });

      it('should indicate that there are no more descendants to retrieve', () => {
        expect(selectors.hasMoreChildren(store.getState()[id].data)).toBeFalsy();
      });

      it('should indicate that there were no more generations to retrieve', () => {
        expect(selectors.hasMoreGenerations(store.getState()[id].data)).toBeFalsy();
      });
    });
    describe('when a tree with detected bounds is loaded', () => {
      it('should set the detected bounds when in the payload', () => {
        dispatchTree(generatedTreeMetadata.formattedTree, endpointSourceSchema, {
          from: 'Sep 19, 2022 @ 20:49:13.452',
          to: 'Sep 19, 2022 @ 20:49:13.452',
        });
        expect(selectors.detectedBounds(store.getState()[id].data)).toBeTruthy();
      });

      it('should clear the previous detected bounds when a new response without detected bounds is recevied', () => {
        dispatchTree(generatedTreeMetadata.formattedTree, endpointSourceSchema, {
          from: 'Sep 19, 2022 @ 20:49:13.452',
          to: 'Sep 19, 2022 @ 20:49:13.452',
        });
        expect(selectors.detectedBounds(store.getState()[id].data)).toBeTruthy();
        dispatchTree(generatedTreeMetadata.formattedTree, endpointSourceSchema);
        expect(selectors.detectedBounds(store.getState()[id].data)).toBeFalsy();
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
        expect(selectors.hasMoreAncestors(store.getState()[id].data)).toBeTruthy();
      });

      it('should indicate that there are more descendants to retrieve', () => {
        expect(selectors.hasMoreChildren(store.getState()[id].data)).toBeTruthy();
      });

      it('should indicate that there were no more generations to retrieve', () => {
        expect(selectors.hasMoreGenerations(store.getState()[id].data)).toBeFalsy();
      });
    });

    describe('when using winlog schema to layout the graph', () => {
      beforeEach(() => {
        dispatchTree(generatedTreeMetadata.formattedTree, winlogSourceSchema);
      });
      it('should indicate that there are more ancestors to retrieve', () => {
        expect(selectors.hasMoreAncestors(store.getState()[id].data)).toBeTruthy();
      });

      it('should indicate that there are more descendants to retrieve', () => {
        expect(selectors.hasMoreChildren(store.getState()[id].data)).toBeTruthy();
      });

      it('should indicate that there were more generations to retrieve', () => {
        expect(selectors.hasMoreGenerations(store.getState()[id].data)).toBeTruthy();
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
        expect(selectors.hasMoreAncestors(store.getState()[id].data)).toBeFalsy();
      });

      it('should indicate that there are more descendants to retrieve', () => {
        expect(selectors.hasMoreChildren(store.getState()[id].data)).toBeTruthy();
      });

      it('should indicate that there were no more generations to retrieve', () => {
        expect(selectors.hasMoreGenerations(store.getState()[id].data)).toBeFalsy();
      });
    });

    describe('when a user sets a custom time range', () => {
      beforeEach(() => {
        const from = 'Sep 21, 2024 @ 20:49:13.452';
        const to = 'Sep 21, 2024 @ 20:49:13.452';
        dispatchTree(generatedTreeMetadata.formattedTree, winlogSourceSchema);
        store.dispatch(
          appReceivedNewExternalProperties({
            id,
            resolverComponentInstanceID: id,
            locationSearch: '',
            databaseDocumentID: id,
            filters: {},
            indices: ['index1'],
            shouldUpdate: false,
          })
        );
        store.dispatch(
          userOverrodeDateRange({
            id,
            timeRange: { from, to },
          })
        );
      });
      it('should use that time over anything else', () => {
        const params = selectors.treeParametersToFetch(store.getState()[id].data);
        if (params?.filters !== undefined) {
          const {
            filters: { from, to },
          } = params;
          expect(from).toEqual('Sep 21, 2024 @ 20:49:13.452');
          expect(to).toEqual('Sep 21, 2024 @ 20:49:13.452');
        }
      });
    });

    describe('when using winlog schema to layout the graph', () => {
      beforeEach(() => {
        dispatchTree(generatedTreeMetadata.formattedTree, winlogSourceSchema);
      });
      it('should indicate that there are no more ancestors to retrieve', () => {
        expect(selectors.hasMoreAncestors(store.getState()[id].data)).toBeFalsy();
      });

      it('should indicate that there are more descendants to retrieve', () => {
        expect(selectors.hasMoreChildren(store.getState()[id].data)).toBeTruthy();
      });

      it('should indicate that there were no more generations to retrieve', () => {
        expect(selectors.hasMoreGenerations(store.getState()[id].data)).toBeFalsy();
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
      const total = selectors.relatedEventTotalCount(store.getState()[id].data)(childNode.id);
      expect(total).toEqual(5);
    });
    it('should have the correct related events stats for a child node', () => {
      // get the first level of children, and there should only be a single child
      const childNode = Array.from(metadata.generatedTree.childrenLevels[0].values())[0];
      const stats = selectors.nodeStats(store.getState()[id].data)(childNode.id);
      expect(stats).toEqual({
        total: 5,
        byCategory: {
          driver: 5,
        },
      });
    });
  });
});
