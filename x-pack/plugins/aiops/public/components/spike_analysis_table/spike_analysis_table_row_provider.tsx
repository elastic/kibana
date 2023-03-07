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

import type { ChangePoint } from '@kbn/ml-agg-utils';

import type { GroupTableItem } from './types';

type ChangePointOrNull = ChangePoint | null;
type GroupOrNull = GroupTableItem | null;

interface SpikeAnalysisTableRow {
  pinnedChangePoint: ChangePointOrNull;
  setPinnedChangePoint: Dispatch<SetStateAction<ChangePointOrNull>>;
  pinnedGroup: GroupOrNull;
  setPinnedGroup: Dispatch<SetStateAction<GroupOrNull>>;
  selectedChangePoint: ChangePointOrNull;
  setSelectedChangePoint: Dispatch<SetStateAction<ChangePointOrNull>>;
  selectedGroup: GroupOrNull;
  setSelectedGroup: Dispatch<SetStateAction<GroupOrNull>>;
  currentSelectedChangePoint?: ChangePoint;
  currentSelectedGroup?: GroupTableItem;
  clearAllRowState: () => void;
}

export const spikeAnalysisTableRowContext = createContext<SpikeAnalysisTableRow | undefined>(
  undefined
);

export const SpikeAnalysisTableRowStateProvider: FC = ({ children }) => {
  // State that will be shared with all components
  const [pinnedChangePoint, setPinnedChangePoint] = useState<ChangePointOrNull>(null);
  const [pinnedGroup, setPinnedGroup] = useState<GroupOrNull>(null);
  const [selectedChangePoint, setSelectedChangePoint] = useState<ChangePointOrNull>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupOrNull>(null);

  // If a row is pinned, still overrule with a potentially hovered row.
  const currentSelectedChangePoint = useMemo(() => {
    if (selectedChangePoint) {
      return selectedChangePoint;
    } else if (pinnedChangePoint) {
      return pinnedChangePoint;
    }
  }, [pinnedChangePoint, selectedChangePoint]);

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
      pinnedChangePoint,
      setPinnedChangePoint,
      pinnedGroup,
      setPinnedGroup,
      selectedChangePoint,
      setSelectedChangePoint,
      selectedGroup,
      setSelectedGroup,
      currentSelectedChangePoint,
      currentSelectedGroup,
      clearAllRowState: () => {
        setPinnedChangePoint(null);
        setPinnedGroup(null);
        setSelectedChangePoint(null);
        setSelectedGroup(null);
      },
    }),
    [
      pinnedChangePoint,
      setPinnedChangePoint,
      pinnedGroup,
      setPinnedGroup,
      selectedChangePoint,
      setSelectedChangePoint,
      selectedGroup,
      setSelectedGroup,
      currentSelectedChangePoint,
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
