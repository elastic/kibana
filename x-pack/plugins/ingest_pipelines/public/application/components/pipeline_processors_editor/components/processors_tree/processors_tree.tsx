/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent, useState, memo, useCallback, useRef, useEffect } from 'react';
import { keyCodes } from '@elastic/eui';

import { ProcessorInternal, ProcessorSelector } from '../../types';

import './tree.scss';

import { PrivateOnActionHandler, PrivateTree } from './components';

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
export const ProcessorsTree: FunctionComponent<Props> = memo(
  ({ processors, baseSelector, onAction }) => {
    // These refs are created here so they can be shared with all
    // recursively rendered trees. Their values should come from react-virtualized
    // List component and WindowScroller component.
    const windowScrollerRef = useRef<any>();
    const listRef = useRef<any>();

    const [selectedProcessorInfo, setSelectedProcessorInfo] = useState<ProcessorInfo | undefined>();

    useEffect(() => {
      const cancelMoveListener = (event: KeyboardEvent) => {
        // x-browser support per https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
        if (event.keyCode === keyCodes.ESCAPE || event.code === 'Escape') {
          setSelectedProcessorInfo(undefined);
        }
      };
      if (selectedProcessorInfo) {
        window.addEventListener('keyup', cancelMoveListener);
      } else {
        window.removeEventListener('keyup', cancelMoveListener);
      }
      return () => window.removeEventListener('keyup', cancelMoveListener);
    }, [selectedProcessorInfo]);

    const privateOnAction = useCallback<PrivateOnActionHandler>(
      (action) => {
        if (action.type === 'selectToMove') {
          setSelectedProcessorInfo(action.payload);
          return;
        }

        if (action.type === 'cancelMove') {
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
          onAction(action);
          setSelectedProcessorInfo(undefined);
          return;
        }
      },
      [onAction, setSelectedProcessorInfo]
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
      />
    );
  }
);
