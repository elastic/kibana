/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiButtonEmpty,
  EuiDraggable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ProcessorInternal } from '../../types';

interface Props {
  pathSelector: string;
  processor: ProcessorInternal;
  index: number;
}

export const TreeNode: FunctionComponent<Props> = ({ processor, pathSelector, index }) => {
  return (
    <EuiDraggable
      spacing="m"
      draggableId={pathSelector}
      key={pathSelector}
      index={index}
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
            <EuiFlexItem grow={false}>{processor.type}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" onClick={() => {}}>
                {i18n.translate('xpack.ingestPipelines.pipelineEditor.editProcessorButtonLabel', {
                  defaultMessage: 'Edit',
                })}
              </EuiButtonEmpty>
              <EuiButtonEmpty
                size="s"
                onClick={
                  () => {}
                  // dispatch({ type: 'removeProcessor', payload: { processor } })
                }
              >
                {i18n.translate('xpack.ingestPipelines.pipelineEditor.deleteProcessorButtonLabel', {
                  defaultMessage: 'Delete',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      )}
    </EuiDraggable>
  );
};
