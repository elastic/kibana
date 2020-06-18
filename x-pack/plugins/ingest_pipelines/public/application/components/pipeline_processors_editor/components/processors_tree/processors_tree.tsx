/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent, memo, useRef, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, keyCodes } from '@elastic/eui';
import { List, WindowScroller } from 'react-virtualized';

import { ProcessorInternal, ProcessorSelector } from '../../types';
import { selectorToDataTestSubject } from '../../utils';

import './processors_tree.scss';
import { AddProcessorButton } from '../add_processor_button';
import { PrivateTree } from './components';

export interface ProcessorInfo {
  id: string;
  selector: ProcessorSelector;
  aboveId?: string;
  belowId?: string;
}

export type Action =
  | { type: 'move'; payload: { source: ProcessorSelector; destination: ProcessorSelector } }
  | { type: 'selectToMove'; payload: { info: ProcessorInfo } }
  | { type: 'cancelMove' }
  | { type: 'addProcessor'; payload: { target: ProcessorSelector } };

export type OnActionHandler = (action: Action) => void;

export interface Props {
  processors: ProcessorInternal[];
  baseSelector: ProcessorSelector;
  onAction: OnActionHandler;
  movingProcessor?: ProcessorInfo;
  'data-test-subj'?: string;
}

/**
 * This component is the public interface to our optimised tree rendering private components and
 * also contains top-level state concerns for an instance of the component
 */
export const ProcessorsTree: FunctionComponent<Props> = memo((props) => {
  const { processors, baseSelector, onAction, movingProcessor } = props;
  // These refs are created here so they can be shared with all
  // recursively rendered trees. Their values should come from react-virtualized
  // List component and WindowScroller component.
  const windowScrollerRef = useRef<WindowScroller>(null);
  const listRef = useRef<List>(null);

  useEffect(() => {
    const cancelMoveKbListener = (event: KeyboardEvent) => {
      // x-browser support per https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
      if (event.keyCode === keyCodes.ESCAPE || event.code === 'Escape') {
        onAction({ type: 'cancelMove' });
      }
    };
    const cancelMoveClickListener = (ev: any) => {
      onAction({ type: 'cancelMove' });
    };
    // Give the browser a chance to flush any click events including the click
    // event that triggered any state transition into selecting a processor to move
    setTimeout(() => {
      if (movingProcessor) {
        window.addEventListener('keyup', cancelMoveKbListener);
        window.addEventListener('click', cancelMoveClickListener);
      } else {
        window.removeEventListener('keyup', cancelMoveKbListener);
        window.removeEventListener('click', cancelMoveClickListener);
      }
    });
    return () => {
      window.removeEventListener('keyup', cancelMoveKbListener);
      window.removeEventListener('click', cancelMoveClickListener);
    };
  }, [movingProcessor, onAction]);

  return (
    <EuiFlexGroup
      data-test-subj={props['data-test-subj']}
      direction="column"
      gutterSize="none"
      responsive={false}
      className="pipelineProcessorsEditor__tree__container"
    >
      <EuiFlexItem grow={false}>
        <PrivateTree
          windowScrollerRef={windowScrollerRef}
          listRef={listRef}
          level={1}
          onAction={onAction}
          movingProcessor={movingProcessor}
          processors={processors}
          selector={baseSelector}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} justifyContent="flexStart" gutterSize="none">
          <EuiFlexItem data-test-subj={selectorToDataTestSubject(baseSelector)} grow={false}>
            <AddProcessorButton
              onClick={() => {
                onAction({ type: 'addProcessor', payload: { target: baseSelector } });
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
