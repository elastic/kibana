/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flow } from 'fp-ts/lib/function';
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useState, useMemo } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiIcon,
  EuiTitle,
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';

import { Pipeline } from '../../../common/types';

import { FormFlyout } from './components';
import { prepareDataIn } from './data_in';
import { prepareDataOut } from './data_out';
import { useEditorState } from './reducer';
import { PipelineEditorProcessor } from './types';

export interface Props {
  pipeline: Pipeline;
  onSubmit: (pipeline: Pipeline) => void;
}

export const PipelineEditor: FunctionComponent<Props> = ({
  pipeline: originalPipeline,
  onSubmit,
}) => {
  const pipeline = useMemo(() => prepareDataIn(originalPipeline), [originalPipeline]);
  const [{ processors }, dispatch] = useEditorState(pipeline);
  const [selectedProcessor, setSelectedProcessor] = useState<PipelineEditorProcessor | undefined>(
    undefined
  );
  const [isAddingNewProcessor, setIsAddingNewProcessor] = useState<boolean>(false);
  const getData = flow(prepareDataOut, onSubmit);

  const dismissFlyout = () => {
    setSelectedProcessor(undefined);
    setIsAddingNewProcessor(false);
  };

  return (
    <>
      <EuiTitle>
        <h1>Pipeline Editor</h1>
      </EuiTitle>
      <EuiSpacer size="m" />
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
      <EuiSpacer size="m" />
      <EuiButton
        data-test-subj="pipelineEditorDoneButton"
        onClick={() => getData({ ...pipeline, processors })}
      >
        {/* TODO: Translate */}
        Save
      </EuiButton>
      {selectedProcessor || isAddingNewProcessor ? (
        <FormFlyout
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
