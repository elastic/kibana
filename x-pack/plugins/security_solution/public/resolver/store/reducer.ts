/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Reducer, AnyAction } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers';
import reduceReducers from 'reduce-reducers';
import { immerCase, EMPTY_RESOLVER } from './helpers';
import { animatePanning } from './camera/methods';
import { layout } from './selectors';
import { cameraReducer } from './camera/reducer';
import { dataReducer } from './data/reducer';
import type { AnalyzerState } from '../types';
import { panAnimationDuration } from './camera/scaling_constants';
import { nodePosition } from '../models/indexed_process_tree/isometric_taxi_layout';
import {
  appReceivedNewExternalProperties,
  userFocusedOnResolverNode,
  userSelectedResolverNode,
  createResolver,
  clearResolver,
} from './actions';
import { serverReturnedResolverData } from './data/action';

export const initialAnalyzerState: AnalyzerState = {
  analyzerById: {},
};

const uiReducer = reducerWithInitialState(initialAnalyzerState)
  .withHandling(
    immerCase(createResolver, (draft, { id }) => {
      if (!draft.analyzerById[id]) {
        draft.analyzerById[id] = EMPTY_RESOLVER;
      }
      return draft;
    })
  )
  .withHandling(
    immerCase(clearResolver, (draft, { id }) => {
      delete draft.analyzerById[id];
      return draft;
    })
  )
  .withHandling(
    immerCase(
      appReceivedNewExternalProperties,
      (draft, { id, resolverComponentInstanceID, locationSearch }) => {
        draft.analyzerById[id].ui.locationSearch = locationSearch;
        draft.analyzerById[id].ui.resolverComponentInstanceID = resolverComponentInstanceID;
      }
    )
  )
  .withHandling(
    immerCase(serverReturnedResolverData, (draft, { id, result }) => {
      draft.analyzerById[id].ui.ariaActiveDescendant = result.originID;
      draft.analyzerById[id].ui.selectedNode = result.originID;
      return draft;
    })
  )
  .withHandling(
    immerCase(userFocusedOnResolverNode, (draft, { id, nodeID, time }) => {
      draft.analyzerById[id].ui.ariaActiveDescendant = nodeID;
      const position = nodePosition(layout(draft.analyzerById[id]), nodeID);
      if (position) {
        draft.analyzerById[id].camera = animatePanning(
          draft.analyzerById[id].camera,
          time,
          position,
          panAnimationDuration
        );
      }
      return draft;
    })
  )
  .withHandling(
    immerCase(userSelectedResolverNode, (draft, { id, nodeID, time }) => {
      draft.analyzerById[id].ui.selectedNode = nodeID;
      draft.analyzerById[id].ui.ariaActiveDescendant = nodeID;
      const position = nodePosition(layout(draft.analyzerById[id]), nodeID);
      if (position) {
        draft.analyzerById[id].camera = animatePanning(
          draft.analyzerById[id].camera,
          time,
          position,
          panAnimationDuration
        );
      }
      return draft;
    })
  )
  .build();

export const analyzerReducer = reduceReducers(
  initialAnalyzerState,
  cameraReducer,
  dataReducer,
  uiReducer
) as unknown as Reducer<AnalyzerState, AnyAction>;
