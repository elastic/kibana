/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type FC,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type { SignificantItem } from '@kbn/ml-agg-utils';

import type { GroupTableItem } from './types';

type SignificantItemOrNull = SignificantItem | null;
type GroupOrNull = GroupTableItem | null;

interface LogRateAnalysisResultsTableRow {
  pinnedSignificantItem: SignificantItemOrNull;
  setPinnedSignificantItem: Dispatch<SetStateAction<SignificantItemOrNull>>;
  pinnedGroup: GroupOrNull;
  setPinnedGroup: Dispatch<SetStateAction<GroupOrNull>>;
  selectedSignificantItem: SignificantItemOrNull;
  setSelectedSignificantItem: Dispatch<SetStateAction<SignificantItemOrNull>>;
  selectedGroup: GroupOrNull;
  setSelectedGroup: Dispatch<SetStateAction<GroupOrNull>>;
  currentSelectedSignificantItem?: SignificantItem;
  currentSelectedGroup?: GroupTableItem;
  clearAllRowState: () => void;
}

export const logRateAnalysisResultsTableRowContext = createContext<
  LogRateAnalysisResultsTableRow | undefined
>(undefined);

export const LogRateAnalysisResultsTableRowStateProvider: FC = ({ children }) => {
  // State that will be shared with all components
  const [pinnedSignificantItem, setPinnedSignificantItem] = useState<SignificantItemOrNull>(null);
  const [pinnedGroup, setPinnedGroup] = useState<GroupOrNull>(null);
  const [selectedSignificantItem, setSelectedSignificantItem] =
    useState<SignificantItemOrNull>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupOrNull>(null);

  // If a row is pinned, still overrule with a potentially hovered row.
  const currentSelectedSignificantItem = useMemo(() => {
    if (selectedSignificantItem) {
      return selectedSignificantItem;
    } else if (pinnedSignificantItem) {
      return pinnedSignificantItem;
    }
  }, [pinnedSignificantItem, selectedSignificantItem]);

  // If a group is pinned, still overrule with a potentially hovered group.
  const currentSelectedGroup = useMemo(() => {
    if (selectedGroup) {
      return selectedGroup;
    } else if (pinnedGroup) {
      return pinnedGroup;
    }
  }, [selectedGroup, pinnedGroup]);

  const contextValue: LogRateAnalysisResultsTableRow = useMemo(
    () => ({
      pinnedSignificantItem,
      setPinnedSignificantItem,
      pinnedGroup,
      setPinnedGroup,
      selectedSignificantItem,
      setSelectedSignificantItem,
      selectedGroup,
      setSelectedGroup,
      currentSelectedSignificantItem,
      currentSelectedGroup,
      clearAllRowState: () => {
        setPinnedSignificantItem(null);
        setPinnedGroup(null);
        setSelectedSignificantItem(null);
        setSelectedGroup(null);
      },
    }),
    [
      pinnedSignificantItem,
      setPinnedSignificantItem,
      pinnedGroup,
      setPinnedGroup,
      selectedSignificantItem,
      setSelectedSignificantItem,
      selectedGroup,
      setSelectedGroup,
      currentSelectedSignificantItem,
      currentSelectedGroup,
    ]
  );

  return (
    // Provider managing the state
    <logRateAnalysisResultsTableRowContext.Provider value={contextValue}>
      {children}
    </logRateAnalysisResultsTableRowContext.Provider>
  );
};

export const useLogRateAnalysisResultsTableRowContext = () => {
  const logRateAnalysisResultsTableRow = useContext(logRateAnalysisResultsTableRowContext);

  // If `undefined`, throw an error.
  if (logRateAnalysisResultsTableRow === undefined) {
    throw new Error('useLogRateAnalysisResultsTableRowContext was used outside of its Provider');
  }

  return logRateAnalysisResultsTableRow;
};
