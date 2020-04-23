/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { ProcessorInternal } from '../../types';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface OnDragEndArgs {
  pathSelector: string;
  sourceIndex: number;
  destinationIndex: number;
}

interface Props {
  pathSelector: string;
  processors: ProcessorInternal[];
  onDragEnd: (args: OnDragEndArgs) => void;
}

export const TreeNode: FunctionComponent<Props> = ({ processors, onDragEnd, pathSelector }) => {
  return (
    <EuiPanel>
      <EuiDragDropContext
        onDragEnd={({ source, destination }) => {
          if (source && destination) {
            onDragEnd({
              pathSelector,
              sourceIndex: source.index,
              destinationIndex: destination.index,
            });
            // dispatch({
            //   type: 'reorderProcessors',
            //   payload: { sourceIdx: source.index, destIdx: destination.index },
            // });
          }
        }}
      >
        <EuiDroppable droppableId={pathSelector} spacing="m">
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
  );
};
