/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useCallback, useContext, useReducer } from 'react';
import { noop } from 'lodash/fp';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FilterManager } from '../../../../../../../src/plugins/data/public/query/filter_manager';
import { SubsetTimelineModel } from '../../store/timeline/model';
import * as i18n from '../../../common/components/events_viewer/translations';
import * as i18nF from '../timeline/footer/translations';
import { timelineDefaults as timelineDefaultModel } from '../../store/timeline/defaults';

interface ManageTimelineInit {
  documentType?: string;
  defaultModel?: SubsetTimelineModel;
  filterManager?: FilterManager;
  footerText?: string;
  id: string;
  loadingText?: string;
  selectAll?: boolean;
  queryFields?: string[];
  title?: string;
  unit?: (totalCount: number) => string;
}

interface ManageTimeline {
  documentType: string;
  defaultModel: SubsetTimelineModel;
  filterManager?: FilterManager;
  footerText: string;
  id: string;
  isLoading: boolean;
  loadingText: string;
  queryFields: string[];
  selectAll: boolean;
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
      type: 'SET_SELECT_ALL';
      id: string;
      payload: boolean;
    };

export const getTimelineDefaults = (id: string) => ({
  defaultModel: timelineDefaultModel,
  loadingText: i18n.LOADING_EVENTS,
  footerText: i18nF.TOTAL_COUNT_OF_EVENTS,
  documentType: i18nF.TOTAL_COUNT_OF_EVENTS,
  selectAll: false,
  id,
  isLoading: false,
  queryFields: [],
  title: i18n.EVENTS,
  unit: (n: number) => i18n.UNIT(n),
});
const reducerManageTimeline = (
  state: ManageTimelineById,
  action: ActionManageTimeline
): ManageTimelineById => {
  switch (action.type) {
    case 'INITIALIZE_TIMELINE':
      return {
        ...state,
        [action.id]: {
          ...getTimelineDefaults(action.id),
          ...state[action.id],
          ...action.payload,
        },
      } as ManageTimelineById;
    case 'SET_SELECT_ALL':
      return {
        ...state,
        [action.id]: {
          ...state[action.id],
          selectAll: action.payload,
        },
      } as ManageTimelineById;

    case 'SET_IS_LOADING':
      return {
        ...state,
        [action.id]: {
          ...state[action.id],
          isLoading: action.payload,
        },
      } as ManageTimelineById;
    default:
      return state;
  }
};

export interface UseTimelineManager {
  getManageTimelineById: (id: string) => ManageTimeline;
  getTimelineFilterManager: (id: string) => FilterManager | undefined;
  initializeTimeline: (newTimeline: ManageTimelineInit) => void;
  isManagedTimeline: (id: string) => boolean;
  setIsTimelineLoading: (isLoadingArgs: { id: string; isLoading: boolean }) => void;
  setSelectAll: (selectAllArgs: { id: string; selectAll: boolean }) => void;
}

export const useTimelineManager = (
  manageTimelineForTesting?: ManageTimelineById
): UseTimelineManager => {
  const [state, dispatch] = useReducer<
    (state: ManageTimelineById, action: ActionManageTimeline) => ManageTimelineById
  >(reducerManageTimeline, manageTimelineForTesting ?? initManageTimeline);

  const initializeTimeline = useCallback((newTimeline: ManageTimelineInit) => {
    dispatch({
      type: 'INITIALIZE_TIMELINE',
      id: newTimeline.id,
      payload: newTimeline,
    });
  }, []);

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

  const setSelectAll = useCallback(({ id, selectAll }: { id: string; selectAll: boolean }) => {
    dispatch({
      type: 'SET_SELECT_ALL',
      id,
      payload: selectAll,
    });
  }, []);

  const getTimelineFilterManager = useCallback(
    (id: string): FilterManager | undefined => state[id]?.filterManager,
    [state]
  );
  const getManageTimelineById = useCallback(
    (id: string): ManageTimeline => {
      if (state[id] != null) {
        return state[id];
      }
      initializeTimeline({ id });
      return getTimelineDefaults(id);
    },
    [initializeTimeline, state]
  );
  const isManagedTimeline = useCallback((id: string): boolean => state[id] != null, [state]);

  return {
    getManageTimelineById,
    getTimelineFilterManager,
    initializeTimeline,
    isManagedTimeline,
    setIsTimelineLoading,
    setSelectAll,
  };
};

const init = {
  getManageTimelineById: (id: string) => getTimelineDefaults(id),
  getTimelineFilterManager: () => undefined,
  initializeTimeline: () => noop,
  isManagedTimeline: () => false,
  setIsTimelineLoading: () => noop,
  setSelectAll: () => noop,
};

const ManageTimelineContext = createContext<UseTimelineManager>(init);

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
