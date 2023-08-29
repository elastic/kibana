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

import type { SignificantTerm } from '@kbn/ml-agg-utils';

import type { GroupTableItem } from './types';

type SignificantTermOrNull = SignificantTerm | null;
type GroupOrNull = GroupTableItem | null;

interface LogRateAnalysisResultsTableRow {
  pinnedSignificantTerm: SignificantTermOrNull;
  setPinnedSignificantTerm: Dispatch<SetStateAction<SignificantTermOrNull>>;
  pinnedGroup: GroupOrNull;
  setPinnedGroup: Dispatch<SetStateAction<GroupOrNull>>;
  selectedSignificantTerm: SignificantTermOrNull;
  setSelectedSignificantTerm: Dispatch<SetStateAction<SignificantTermOrNull>>;
  selectedGroup: GroupOrNull;
  setSelectedGroup: Dispatch<SetStateAction<GroupOrNull>>;
  currentSelectedSignificantTerm?: SignificantTerm;
  currentSelectedGroup?: GroupTableItem;
  clearAllRowState: () => void;
}

export const logRateAnalysisResultsTableRowContext = createContext<
  LogRateAnalysisResultsTableRow | undefined
>(undefined);

export const LogRateAnalysisResultsTableRowStateProvider: FC = ({ children }) => {
  // State that will be shared with all components
  const [pinnedSignificantTerm, setPinnedSignificantTerm] = useState<SignificantTermOrNull>(null);
  const [pinnedGroup, setPinnedGroup] = useState<GroupOrNull>(null);
  const [selectedSignificantTerm, setSelectedSignificantTerm] =
    useState<SignificantTermOrNull>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupOrNull>(null);

  // If a row is pinned, still overrule with a potentially hovered row.
  const currentSelectedSignificantTerm = useMemo(() => {
    if (selectedSignificantTerm) {
      return selectedSignificantTerm;
    } else if (pinnedSignificantTerm) {
      return pinnedSignificantTerm;
    }
  }, [pinnedSignificantTerm, selectedSignificantTerm]);

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
      pinnedSignificantTerm,
      setPinnedSignificantTerm,
      pinnedGroup,
      setPinnedGroup,
      selectedSignificantTerm,
      setSelectedSignificantTerm,
      selectedGroup,
      setSelectedGroup,
      currentSelectedSignificantTerm,
      currentSelectedGroup,
      clearAllRowState: () => {
        setPinnedSignificantTerm(null);
        setPinnedGroup(null);
        setSelectedSignificantTerm(null);
        setSelectedGroup(null);
      },
    }),
    [
      pinnedSignificantTerm,
      setPinnedSignificantTerm,
      pinnedGroup,
      setPinnedGroup,
      selectedSignificantTerm,
      setSelectedSignificantTerm,
      selectedGroup,
      setSelectedGroup,
      currentSelectedSignificantTerm,
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
