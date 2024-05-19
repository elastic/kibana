/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dictionary, groupBy } from 'lodash';
import React, { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { CriticalPathSegment } from '../../../../../../../../common/critical_path/types';
import { getCriticalPath } from '../../../../../../../../common/critical_path/get_critical_path';
import {
  buildTraceTree,
  convertTreeToList,
  IWaterfall,
  IWaterfallNode,
  IWaterfallNodeFlatten,
  IWaterfallSpanOrTransaction,
  updateTraceTreeNode,
} from '../waterfall_helpers/waterfall_helpers';

interface WaterfallContextProps {
  item: IWaterfallSpanOrTransaction;
  waterfall: IWaterfall;
  showCriticalPath: boolean;
  maxLevelOpen: number;
  isOpen: boolean;
}

export const WaterfallContext = React.createContext<
  {
    criticalPathSegmentsById: Dictionary<CriticalPathSegment[]>;
    errorCount: number;
    showCriticalPath: boolean;
    traceList: IWaterfallNodeFlatten[];
    updateTreeNode: (newTree: IWaterfallNodeFlatten) => void;
  } & Pick<WaterfallContextProps, 'showCriticalPath'>
>({
  criticalPathSegmentsById: {} as Dictionary<CriticalPathSegment[]>,
  errorCount: 0,
  showCriticalPath: false,
  traceList: [],
  updateTreeNode: () => undefined,
});

export function WaterfallContextProvider({
  item,
  showCriticalPath,
  waterfall,
  maxLevelOpen,
  children,
  isOpen,
}: PropsWithChildren<WaterfallContextProps>) {
  const [tree, setTree] = useState<IWaterfallNode | null>(null);
  const criticalPath = useMemo(
    () => (showCriticalPath ? getCriticalPath(waterfall) : undefined),
    [showCriticalPath, waterfall]
  );

  const criticalPathSegmentsById = useMemo(
    () => groupBy(criticalPath?.segments, (segment) => segment.item.id),
    [criticalPath?.segments]
  );

  const errorCount = useMemo(() => waterfall.getErrorCount(item.id), [item.id, waterfall]);

  const traceList = useMemo(() => {
    return convertTreeToList(tree);
  }, [tree]);

  const updateTreeNode = useCallback(
    (updatedNode: IWaterfallNodeFlatten) => {
      if (!tree) return;

      const newTree = updateTraceTreeNode(tree, updatedNode);

      if (newTree) {
        setTree(newTree);
      }
    },
    [tree]
  );

  useEffect(() => {
    if (!tree) {
      setTree(
        buildTraceTree(waterfall, criticalPathSegmentsById, showCriticalPath, maxLevelOpen, isOpen)
      );
    }
  }, [criticalPathSegmentsById, maxLevelOpen, showCriticalPath, waterfall, tree, isOpen]);

  return (
    <WaterfallContext.Provider
      value={{
        showCriticalPath,
        criticalPathSegmentsById,
        errorCount,
        traceList,
        updateTreeNode,
      }}
    >
      {children}
    </WaterfallContext.Provider>
  );
}
