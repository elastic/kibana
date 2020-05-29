/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useCallback, useContext, useReducer } from 'react';
import { noop } from 'lodash/fp';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FilterManager } from '../../../../../../../src/plugins/data/public/query/filter_manager';
import { TimelineRowAction } from '../timeline/body/actions';
import * as i18n from '../../../common/components/events_viewer/translations';
import * as i18nF from '../timeline/footer/translations';

interface ManageTimelineInit {
  documentType?: string;
  footerText?: string;
  id: string;
  indexToAdd?: string[] | null;
  loadingText?: string;
  selectAll?: boolean;
  title?: string;
  unit?: (totalCount: number) => string;
}

interface ManageTimeline {
  documentType: string;
  filterManager?: FilterManager;
  footerText: string;
  id: string;
  indexToAdd: string[] | null;
  isLoading: boolean;
  loadingText: string;
  queryFields: string[];
  selectAll: boolean;
  timelineRowActions: TimelineRowAction[];
  title: string;
  unit: (totalCount: number) => string;
}

interface ManageTimelineById {
  [id: string]: ManageTimeline;
}
const initManageTimeline: ManageTimelineById = {};
type ActionManageTimeline =
  | {
      type: 'INITIALIZE_TIMELINE';
      id: string;
      payload: ManageTimelineInit;
    }
  | {
      type: 'SET_IS_LOADING';
      id: string;
      payload: boolean;
    }
  | {
      type: 'SET_TIMELINE_ACTIONS';
      id: string;
      payload: { queryFields?: string[]; timelineRowActions: TimelineRowAction[] };
    }
  | {
      type: 'SET_TIMELINE_FILTER_MANAGER';
      id: string;
      payload: FilterManager;
    };

const timelineDefaults = {
  indexToAdd: null,
  loadingText: i18n.LOADING_EVENTS,
  footerText: i18nF.TOTAL_COUNT_OF_EVENTS,
  documentType: i18nF.TOTAL_COUNT_OF_EVENTS,
  selectAll: false,
  isLoading: false,
  queryFields: [],
  timelineRowActions: [],
  title: i18n.EVENTS,
  unit: (n: number) => i18n.UNIT(n),
};
const reducerManageTimeline = (state: ManageTimelineById, action: ActionManageTimeline) => {
  switch (action.type) {
    case 'INITIALIZE_TIMELINE':
      return {
        ...state,
        [action.id]: {
          ...timelineDefaults,
          ...state[action.id],
          ...action.payload,
        },
      };
    case 'SET_TIMELINE_ACTIONS':
    case 'SET_TIMELINE_FILTER_MANAGER':
      return {
        ...state,
        [action.id]: {
          ...state[action.id],
          ...action.payload,
        },
      };
    case 'SET_IS_LOADING':
      return {
        ...state,
        [action.id]: {
          ...state[action.id],
          isLoading: action.payload,
        },
      };
    default:
      return state;
  }
};

interface ManageGlobalTimeline {
  getManageTimelineById: (id: string) => ManageTimeline;
  getTimelineFilterManager: (id: string) => FilterManager | undefined;
  initializeTimeline: (newTimeline: ManageTimelineInit) => void;
  setIsTimelineLoading: (isLoadingArgs: { id: string; isLoading: boolean }) => void;
  setTimelineRowActions: (actionsArgs: {
    id: string;
    queryFields?: string[];
    timelineRowActions: TimelineRowAction[];
  }) => void;
  setTimelineFilterManager: (filterArgs: { id: string; filterManager: FilterManager }) => void;
}

const useTimelineManager = (
  manageTimelineForTesting?: ManageTimelineById
): ManageGlobalTimeline => {
  const [state, dispatch] = useReducer(
    reducerManageTimeline,
    manageTimelineForTesting ?? initManageTimeline
  );

  const initializeTimeline = useCallback((newTimeline: ManageTimelineInit) => {
    dispatch({
      type: 'INITIALIZE_TIMELINE',
      id: newTimeline.id,
      payload: newTimeline,
    });
  }, []);

  const setTimelineRowActions = useCallback(
    ({
      id,
      queryFields,
      timelineRowActions,
    }: {
      id: string;
      queryFields?: string[];
      timelineRowActions: TimelineRowAction[];
    }) => {
      dispatch({
        type: 'SET_TIMELINE_ACTIONS',
        id,
        payload: { queryFields, timelineRowActions },
      });
    },
    []
  );

  const setTimelineFilterManager = useCallback(
    ({ id, filterManager }: { id: string; filterManager: FilterManager }) => {
      dispatch({
        type: 'SET_TIMELINE_FILTER_MANAGER',
        id,
        payload: filterManager,
      });
    },
    []
  );

  const setIsTimelineLoading = useCallback(
    ({ id, isLoading }: { id: string; isLoading: boolean }) => {
      dispatch({
        type: 'SET_IS_LOADING',
        id,
        payload: isLoading,
      });
    },
    []
  );

  const getTimelineFilterManager = useCallback(
    (id: string): FilterManager | undefined => state[id].filterManager,
    [state]
  );
  const getManageTimelineById = useCallback(
    (id: string): ManageTimeline => {
      if (state[id] != null) {
        return state[id];
      }
      initializeTimeline({ id });
      return { ...timelineDefaults, id };
    },
    [state]
  );

  return {
    getManageTimelineById,
    getTimelineFilterManager,
    initializeTimeline,
    setIsTimelineLoading,
    setTimelineRowActions,
    setTimelineFilterManager,
  };
};

const init = {
  getManageTimelineById: (id: string) => ({ ...timelineDefaults, id }),
  getTimelineFilterManager: () => undefined,
  initializeTimeline: () => noop,
  setIsTimelineLoading: () => noop,
  setTimelineRowActions: () => noop,
  setTimelineFilterManager: () => noop,
};
const ManageTimelineContext = createContext<ManageGlobalTimeline>(init);

export const useManageTimeline = () => useContext(ManageTimelineContext);

interface ManageGlobalTimelineProps {
  children: React.ReactNode;
  manageTimelineForTesting?: ManageTimelineById;
}

export const ManageGlobalTimeline = ({
  children,
  manageTimelineForTesting,
}: ManageGlobalTimelineProps) => {
  const timelineManager = useTimelineManager(manageTimelineForTesting);

  return (
    <ManageTimelineContext.Provider value={timelineManager}>
      {children}
    </ManageTimelineContext.Provider>
  );
};
