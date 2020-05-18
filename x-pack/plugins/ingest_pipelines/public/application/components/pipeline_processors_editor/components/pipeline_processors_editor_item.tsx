/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ProcessorInternal } from '../types';

type ProcessorClickEventType = 'edit' | 'addOnFailure' | 'delete';

export interface Props {
  processor: ProcessorInternal;
  onClick: (eventType: ProcessorClickEventType) => void;
}

export const PipelineProcessorsEditorItem: FunctionComponent<Props> = ({ processor, onClick }) => {
  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>{processor.type}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty size="s" onClick={() => onClick('edit')}>
          {i18n.translate('xpack.ingestPipelines.pipelineEditor.editProcessorButtonLabel', {
            defaultMessage: 'Edit',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty size="s" onClick={() => onClick('delete')}>
          {i18n.translate('xpack.ingestPipelines.pipelineEditor.deleteProcessorButtonLabel', {
            defaultMessage: 'Delete',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty size="s" onClick={() => onClick('addOnFailure')}>
          {i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.addOnFailureHandlerProcessorButtonLabel',
            {
              defaultMessage: 'Add on failure handler',
            }
          )}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
