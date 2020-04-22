/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useState, useMemo, useEffect, useCallback } from 'react';
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

import { Processor } from '../../../../common/types';

import { SettingsFormFlyout } from './components';
import { prepareDataIn } from './data_in';
import { prepareDataOut, DataOutResult } from './data_out';
import { useEditorState } from './reducer';
import { PipelineEditorProcessor } from './types';

export interface OnUpdateHandlerArg {
  getData: () => DataOutResult;
  validate: () => Promise<boolean>;
  isValid?: boolean;
}

export type OnUpdateHandler = (arg: OnUpdateHandlerArg) => void;

export interface Props {
  value: {
    processors: Processor[];
    onFailure?: Processor[];
  };
  onUpdate: (arg: OnUpdateHandlerArg) => void;
}

export const PipelineProcessorsEditor: FunctionComponent<Props> = ({
  value: { processors: originalProcessors },
  onUpdate,
}) => {
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
    onUpdate({
      isValid: state.isValid,
      validate: state.validate,
      getData: () => prepareDataOut(state),
    });
  }, [state, onUpdate]);

  const dismissFlyout = () => {
    setSelectedProcessor(undefined);
    setIsAddingNewProcessor(false);
  };

  const onFormUpdate = useCallback(
    arg => {
      dispatch({ type: 'processorForm.update', payload: arg });
    },
    [dispatch]
  );

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
          onFormUpdate={onFormUpdate}
          processor={selectedProcessor}
          onClose={() => {
            dismissFlyout();
            dispatch({ type: 'processorForm.close' });
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
