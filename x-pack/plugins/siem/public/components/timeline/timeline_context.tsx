/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, memo, useContext, useEffect, useState } from 'react';

import { FilterManager } from '../../../../../../src/plugins/data/public';

import { TimelineAction } from './body/actions';

interface TimelineContextState {
  filterManager: FilterManager | undefined;
  isLoading: boolean;
}

const initTimelineContext: TimelineContextState = { filterManager: undefined, isLoading: false };
export const TimelineContext = createContext<TimelineContextState>(initTimelineContext);
export const useTimelineContext = () => useContext(TimelineContext);

export interface TimelineTypeContextProps {
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
const initTimelineType: TimelineTypeContextProps = {
  documentType: undefined,
  footerText: undefined,
  id: undefined,
  indexToAdd: undefined,
  loadingText: undefined,
  queryFields: [],
  selectAll: false,
  timelineActions: [],
  title: undefined,
  unit: undefined,
};
export const TimelineTypeContext = createContext<TimelineTypeContextProps>(initTimelineType);
export const useTimelineTypeContext = () => useContext(TimelineTypeContext);

interface ManageTimelineContextProps {
  children: React.ReactNode;
  filterManager: FilterManager;
  indexToAdd?: string[] | null;
  loading: boolean;
  type?: TimelineTypeContextProps;
}

// todo we need to refactor this as more complex context/reducer with useReducer
// to avoid so many Context, at least the separation of code is there now
const ManageTimelineContextComponent: React.FC<ManageTimelineContextProps> = ({
  children,
  filterManager,
  indexToAdd,
  loading,
  type = { ...initTimelineType, indexToAdd },
}) => {
  const [myContextState, setMyContextState] = useState<TimelineContextState>({
    filterManager,
    isLoading: false,
  });
  const [myType, setType] = useState<TimelineTypeContextProps>(type);

  useEffect(() => {
    setMyContextState({ filterManager, isLoading: loading });
  }, [setMyContextState, filterManager, loading]);

  useEffect(() => {
    setType({ ...type, indexToAdd });
  }, [type, indexToAdd]);

  return (
    <TimelineContext.Provider value={myContextState}>
      <TimelineTypeContext.Provider value={myType}>{children}</TimelineTypeContext.Provider>
    </TimelineContext.Provider>
  );
};

export const ManageTimelineContext = memo(ManageTimelineContextComponent);
