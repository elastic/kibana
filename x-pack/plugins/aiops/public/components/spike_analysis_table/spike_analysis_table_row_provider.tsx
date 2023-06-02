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

interface SpikeAnalysisTableRow {
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

export const spikeAnalysisTableRowContext = createContext<SpikeAnalysisTableRow | undefined>(
  undefined
);

export const SpikeAnalysisTableRowStateProvider: FC = ({ children }) => {
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

  const contextValue: SpikeAnalysisTableRow = useMemo(
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
    <spikeAnalysisTableRowContext.Provider value={contextValue}>
      {children}
    </spikeAnalysisTableRowContext.Provider>
  );
};

export const useSpikeAnalysisTableRowContext = () => {
  const spikeAnalysisTableRow = useContext(spikeAnalysisTableRowContext);

  // If `undefined`, throw an error.
  if (spikeAnalysisTableRow === undefined) {
    throw new Error('useSpikeAnalysisTableRowContext was used outside of its Provider');
  }

  return spikeAnalysisTableRow;
};
