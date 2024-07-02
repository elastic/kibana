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
  updateTraceTreeNode,
} from '../waterfall_helpers/waterfall_helpers';

export interface WaterfallContextProps {
  waterfall: IWaterfall;
  showCriticalPath: boolean;
  maxLevelOpen: number;
  isOpen: boolean;
}

export const WaterfallContext = React.createContext<
  {
    criticalPathSegmentsById: Dictionary<CriticalPathSegment[]>;
    showCriticalPath: boolean;
    traceList: IWaterfallNodeFlatten[];
    getErrorCount: (waterfallItemId: string) => number;
    updateTreeNode: (newTree: IWaterfallNodeFlatten) => void;
  } & Pick<WaterfallContextProps, 'showCriticalPath'>
>({
  criticalPathSegmentsById: {} as Dictionary<CriticalPathSegment[]>,
  showCriticalPath: false,
  traceList: [],
  getErrorCount: () => 0,
  updateTreeNode: () => undefined,
});

export function WaterfallContextProvider({
  showCriticalPath,
  waterfall,
  maxLevelOpen,
  children,
  isOpen,
}: PropsWithChildren<WaterfallContextProps>) {
  const [tree, setTree] = useState<IWaterfallNode | null>(null);
  const criticalPathSegmentsById = useMemo(() => {
    if (!showCriticalPath) {
      return {};
    }

    const criticalPath = getCriticalPath(waterfall);
    return groupBy(criticalPath.segments, (segment) => segment.item.id);
  }, [showCriticalPath, waterfall]);

  const traceList = useMemo(() => {
    return convertTreeToList(tree);
  }, [tree]);

  const getErrorCount = useCallback(
    (waterfallItemId) => waterfall.getErrorCount(waterfallItemId),
    [waterfall]
  );

  const updateTreeNode = useCallback(
    (updatedNode: IWaterfallNodeFlatten) => {
      if (!tree) return;

      const newTree = updateTraceTreeNode({
        root: tree,
        updatedNode,
        waterfall,
        path: {
          criticalPathSegmentsById,
          showCriticalPath,
        },
      });

      if (newTree) {
        setTree(newTree);
      }
    },
    [criticalPathSegmentsById, showCriticalPath, tree, waterfall]
  );

  useEffect(() => {
    const root = buildTraceTree({
      waterfall,
      maxLevelOpen,
      isOpen,
      path: {
        criticalPathSegmentsById,
        showCriticalPath,
      },
    });

    setTree(root);
  }, [criticalPathSegmentsById, isOpen, maxLevelOpen, showCriticalPath, waterfall]);

  return (
    <WaterfallContext.Provider
      value={{
        showCriticalPath,
        criticalPathSegmentsById,
        getErrorCount,
        traceList,
        updateTreeNode,
      }}
    >
      {children}
    </WaterfallContext.Provider>
  );
}
