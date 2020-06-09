/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent, useState, memo, useCallback, useRef } from 'react';

import { ProcessorInternal, ProcessorSelector } from '../../types';

import './tree.scss';

import { PrivateOnActionHandler, PrivateTree } from './private_tree';

export type TreeMode = 'copy' | 'move' | 'idle';

export interface ProcessorInfo {
  id: string;
  selector: ProcessorSelector;
  aboveId?: string;
  belowId?: string;
}

export type Action =
  | { type: 'move'; payload: { source: ProcessorSelector; destination: ProcessorSelector } }
  | { type: 'edit'; payload: { selector: ProcessorSelector; processor: ProcessorInternal } }
  | { type: 'duplicate'; payload: { source: ProcessorSelector } }
  | { type: 'addOnFailure'; payload: { target: ProcessorSelector } }
  | { type: 'remove'; payload: { selector: ProcessorSelector; processor: ProcessorInternal } };

export type OnActionHandler = (action: Action) => void;

export interface Props {
  processors: ProcessorInternal[];
  baseSelector: ProcessorSelector;
  onAction: OnActionHandler;
}

/**
 * This component is the public interface to our optimised tree rendering private components and
 * also contains top-level state concerns for an instance of the component
 */
export const Tree: FunctionComponent<Props> = memo(({ processors, baseSelector, onAction }) => {
  const windowScrollerRef = useRef<any>();
  const listRef = useRef<any>();
  const [treeMode, setTreeMode] = useState<TreeMode>('idle');
  const [selectedProcessorInfo, setSelectedProcessorInfo] = useState<ProcessorInfo | undefined>();
  const privateOnAction = useCallback<PrivateOnActionHandler>(
    (action) => {
      if (action.type === 'selectToMove') {
        setTreeMode('move');
        setSelectedProcessorInfo(action.payload);
        return;
      }

      if (action.type === 'cancelMove') {
        setTreeMode('idle');
        setSelectedProcessorInfo(undefined);
        return;
      }

      if (
        action.type === 'move' ||
        action.type === 'edit' ||
        action.type === 'remove' ||
        action.type === 'addOnFailure' ||
        action.type === 'duplicate'
      ) {
        setTreeMode('idle');
        onAction(action);
        setSelectedProcessorInfo(undefined);
        return;
      }
    },
    [onAction, setSelectedProcessorInfo, setTreeMode]
  );
  return (
    <PrivateTree
      windowScrollerRef={windowScrollerRef}
      listRef={listRef}
      onHeightChange={() => windowScrollerRef.current?.updatePosition()}
      level={1}
      privateOnAction={privateOnAction}
      selectedProcessorInfo={selectedProcessorInfo}
      processors={processors}
      selector={baseSelector}
      mode={treeMode}
    />
  );
});
