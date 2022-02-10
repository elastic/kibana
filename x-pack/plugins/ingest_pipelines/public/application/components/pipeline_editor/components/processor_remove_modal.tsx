/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { ProcessorInternal, ProcessorSelector } from '../types';

interface Props {
  processor: ProcessorInternal;
  selector: ProcessorSelector;
  onResult: (arg: { confirmed: boolean; selector: ProcessorSelector }) => void;
}

export const ProcessorRemoveModal = ({ processor, onResult, selector }: Props) => {
  return (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="removeProcessorConfirmationModal"
      title={
        <FormattedMessage
          id="xpack.ingestPipelines.pipelineEditor.removeProcessorModal.titleText"
          defaultMessage="Delete {type} processor"
          values={{ type: processor.type }}
        />
      }
      onCancel={() => onResult({ confirmed: false, selector })}
      onConfirm={() => onResult({ confirmed: true, selector })}
      cancelButtonText={
        <FormattedMessage
          id="xpack.ingestPipelines.pipelineEditor.removeProcessorModal.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.ingestPipelines.pipelineEditor.removeProcessorModal.confirmationButtonLabel"
          defaultMessage="Delete processor"
        />
      }
    >
      <p>
        <FormattedMessage
          id="xpack.ingestPipelines.pipelineEditor.deleteModal.deleteDescription"
          defaultMessage="Delete this processor and its on-failure handlers."
        />
      </p>
    </EuiConfirmModal>
  );
};
