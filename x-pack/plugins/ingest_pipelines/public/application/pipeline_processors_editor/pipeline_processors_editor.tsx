/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useState, useMemo, useRef, useEffect } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiIcon,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';

import { Processor } from '../../../common/types';

import { SettingsFormFlyout } from './components';
import { prepareDataIn } from './data_in';
import { prepareDataOut, DataOutResult } from './data_out';
import { useEditorState } from './reducer';
import { PipelineEditorProcessor } from './types';

export interface Props {
  processors: Processor[];
  /**
   * This follows the pattern of other components that wish to expose
   * a state without emitting state updates to parents, e.g.:
   *
   * <input ref={myInputRef => ... } />
   *
   * In this case we share a well defined API that contains the latest
   * state reader. Callers can create a ref of their own to point to
   * this reader, e.g., useRef<{@link StateReader}>() so they can
   * imperatively choose when to read state.
   */
  stateReaderRef: (stateReader: { read: () => DataOutResult }) => void;
  onFailure?: Processor[];
}

export interface StateReader {
  read: () => DataOutResult;
}

export const PipelineProcessorsEditor: FunctionComponent<Props> = ({
  processors: originalProcessors,
  stateReaderRef,
}) => {
  const internalStateReaderRef = useRef<StateReader>({ read: undefined as any });
  const dataInResult = useMemo(() => prepareDataIn({ processors: originalProcessors }), [
    originalProcessors,
  ]);
  const [state, dispatch] = useEditorState(dataInResult);
  const { processors } = state;
  const [selectedProcessor, setSelectedProcessor] = useState<PipelineEditorProcessor | undefined>(
    undefined
  );
  const [isAddingNewProcessor, setIsAddingNewProcessor] = useState<boolean>(false);

  useEffect(() => {
    internalStateReaderRef.current.read = () => prepareDataOut(state);
  }, [state]);

  useEffect(() => {
    // Share our state reader instance with callers, do this once only
    stateReaderRef(internalStateReaderRef.current);
  });

  const dismissFlyout = () => {
    setSelectedProcessor(undefined);
    setIsAddingNewProcessor(false);
  };

  return (
    <>
      <EuiPanel>
        <EuiDragDropContext
          onDragEnd={({ source, destination }) => {
            if (source && destination) {
              dispatch({
                type: 'reorderProcessors',
                payload: { sourceIdx: source.index, destIdx: destination.index },
              });
            }
          }}
        >
          <EuiDroppable droppableId="PipelineEditorDroppableArea" spacing="m">
            {processors.map((processor, idx) => {
              const { type, id } = processor;
              return (
                <EuiDraggable
                  spacing="m"
                  key={id}
                  draggableId={id}
                  index={idx}
                  customDragHandle={true}
                >
                  {provided => (
                    <EuiPanel paddingSize="m">
                      <EuiFlexGroup alignItems="center">
                        <EuiFlexItem grow={false}>
                          <div {...provided.dragHandleProps}>
                            <EuiIcon type="grab" />
                          </div>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>{type}</EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty size="s" onClick={() => setSelectedProcessor(processor)}>
                            {i18n.translate(
                              'xpack.ingestPipelines.pipelineEditor.editProcessorButtonLabel',
                              { defaultMessage: 'Edit' }
                            )}
                          </EuiButtonEmpty>
                          <EuiButtonEmpty
                            size="s"
                            onClick={() =>
                              dispatch({ type: 'removeProcessor', payload: { processor } })
                            }
                          >
                            {i18n.translate(
                              'xpack.ingestPipelines.pipelineEditor.deleteProcessorButtonLabel',
                              { defaultMessage: 'Delete' }
                            )}
                          </EuiButtonEmpty>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                  )}
                </EuiDraggable>
              );
            })}
          </EuiDroppable>
        </EuiDragDropContext>
        {/* TODO: Translate */}
        <EuiButton onClick={() => setIsAddingNewProcessor(true)}>Add a processor</EuiButton>
      </EuiPanel>
      {selectedProcessor || isAddingNewProcessor ? (
        <SettingsFormFlyout
          processor={selectedProcessor}
          onClose={() => {
            dismissFlyout();
          }}
          onSubmit={processorSettings => {
            if (isAddingNewProcessor) {
              dispatch({ type: 'addProcessor', payload: { processor: processorSettings } });
            } else {
              dispatch({
                type: 'updateProcessor',
                payload: {
                  processor: {
                    ...selectedProcessor!,
                    ...processorSettings,
                  },
                },
              });
            }
            dismissFlyout();
          }}
        />
      ) : (
        undefined
      )}
    </>
  );
};
