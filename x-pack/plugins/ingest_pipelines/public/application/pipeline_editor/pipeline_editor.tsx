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
  euiDragDropReorder,
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
import { PipelineEditorProcessor } from './types';

export interface Props {
  pipeline: Pipeline;
  onDone: () => Pipeline;
}

export const PipelineEditor: FunctionComponent<Props> = ({
  pipeline: originalPipeline,
  onDone,
}) => {
  const pipeline = useMemo(() => prepareDataIn(originalPipeline), [originalPipeline]);
  const [processors, setProcessors] = useState(pipeline.processors);
  const [selectedProcessor, setSelectedProcessor] = useState<PipelineEditorProcessor | undefined>(
    undefined
  );
  const getData = flow(prepareDataOut, onDone);

  return (
    <>
      <EuiTitle>
        <h1>Pipeline Editor</h1>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiDragDropContext
        onDragEnd={({ source, destination }) => {
          if (source && destination) {
            setProcessors(previous =>
              euiDragDropReorder(previous, source.index, destination.index)
            );
          }
        }}
      >
        <EuiDroppable droppableId="PipelineEditorDroppableArea" spacing="m" withPanel>
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
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                )}
              </EuiDraggable>
            );
          })}
        </EuiDroppable>
      </EuiDragDropContext>
      <EuiButton
        data-test-subj="pipelineEditorDoneButton"
        onClick={() => getData({ ...pipeline, processors })}
      >
        Submit
      </EuiButton>
      {selectedProcessor && (
        <FormFlyout processor={selectedProcessor} onClose={() => setSelectedProcessor(undefined)} />
      )}
    </>
  );
};
