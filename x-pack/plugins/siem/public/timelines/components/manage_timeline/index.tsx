/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import React, { createContext, Dispatch, useContext, useReducer } from 'react';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FilterManager } from '../../../../../../../src/plugins/data/public/query/filter_manager';
import { TimelineAction } from '../timeline/body/actions';

interface TimelineContextState {
  filterManager: FilterManager | undefined;
  isLoading: boolean;
}
export interface TimelineTypeContext {
  documentType?: string;
  footerText?: string;
  id?: string;
  indexToAdd?: string[] | null;
  loadingText?: string;
  queryFields?: string[];
  selectAll?: boolean;
  timelineActions?: TimelineAction[];
  title?: string;
  unit?: (totalCount: number) => string;
}
interface ManageTimeline {
  timelineContextState?: TimelineContextState;
  timelineTypeContext?: TimelineTypeContext;
}

interface ManageTimelineById {
  [id: string]: ManageTimeline;
}
const initManageTimeline: ManageTimelineById = {};
type ActionManageTimeline =
  | {
      type: 'setTimelineContextState';
      id: string;
      timelineContextState: TimelineContextState;
    }
  | {
      type: 'setTimelineTypeContext';
      id: string;
      timelineTypeContext: TimelineTypeContext;
    };

const ManageTimelineContext = createContext<[ManageTimelineById, Dispatch<ActionManageTimeline>]>([
  initManageTimeline,
  () => noop,
]);

export const useManageTimeline = () => useContext(ManageTimelineContext);

interface ManageGlobalTimelineProps {
  children: React.ReactNode;
  manageTimelineForTesting?: ManageTimelineById;
}

export const ManageGlobalTimeline = ({
  children,
  manageTimelineForTesting,
}: ManageGlobalTimelineProps) => {
  const reducerManageTimeline = (state: ManageTimelineById, action: ActionManageTimeline) => {
    switch (action.type) {
      case 'setTimelineContextState':
        return {
          ...state,
          [action.id]: {
            ...state[action.id],
            timelineContextState:
              state[action.id] && state[action.id].timelineContextState
                ? { ...state[action.id].timelineContextState, ...action.timelineContextState }
                : action.timelineContextState,
          },
        };
      case 'setTimelineTypeContext':
        return {
          ...state,
          [action.id]: {
            ...state[action.id],
            timelineTypeContext:
              state[action.id] && state[action.id].timelineTypeContext
                ? { ...state[action.id].timelineTypeContext, ...action.timelineTypeContext }
                : action.timelineTypeContext,
          },
        };
      default:
        return state;
    }
  };

  return (
    <ManageTimelineContext.Provider
      value={useReducer(reducerManageTimeline, manageTimelineForTesting ?? initManageTimeline)}
    >
      {children}
    </ManageTimelineContext.Provider>
  );
};
