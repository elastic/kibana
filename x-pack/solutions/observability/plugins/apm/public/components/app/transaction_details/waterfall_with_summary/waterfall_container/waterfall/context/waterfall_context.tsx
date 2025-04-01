/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dictionary } from 'lodash';
import { groupBy } from 'lodash';
import type { PropsWithChildren } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CriticalPathSegment } from '../../../../../../../../common/critical_path/types';
import { getCriticalPath } from '../../../../../../../../common/critical_path/get_critical_path';
import type {
  IWaterfall,
  IWaterfallNode,
  IWaterfallNodeFlatten,
} from '../waterfall_helpers/waterfall_helpers';
import {
  buildTraceTree,
  convertTreeToList,
  updateTraceTreeNode,
} from '../waterfall_helpers/waterfall_helpers';

export interface WaterfallContextProps {
  waterfall: IWaterfall;
  showCriticalPath: boolean;
  maxLevelOpen: number;
  isOpen: boolean;
  isEmbeddable: boolean;
}

export const WaterfallContext = React.createContext<
  {
    criticalPathSegmentsById: Dictionary<CriticalPathSegment[]>;
    showCriticalPath: boolean;
    traceList: IWaterfallNodeFlatten[];
    getErrorCount: (waterfallItemId: string) => number;
    updateTreeNode: (newTree: IWaterfallNodeFlatten) => void;
    isEmbeddable: boolean;
  } & Pick<WaterfallContextProps, 'showCriticalPath'>
>({
  criticalPathSegmentsById: {} as Dictionary<CriticalPathSegment[]>,
  showCriticalPath: false,
  traceList: [],
  getErrorCount: () => 0,
  updateTreeNode: () => undefined,
  isEmbeddable: false,
});

export function WaterfallContextProvider({
  showCriticalPath,
  waterfall,
  maxLevelOpen,
  children,
  isOpen,
  isEmbeddable,
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
    (waterfallItemId: string) => waterfall.getErrorCount(waterfallItemId),
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
        isEmbeddable,
      }}
    >
      {children}
    </WaterfallContext.Provider>
  );
}
