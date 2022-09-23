/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../../shared/kibana/kibana_logic';
import { PipelinesLogic } from '../pipelines_logic';

export interface AddMLInferencePipelineButtonProps {
  onClick: () => void;
}
export const AddMLInferencePipelineButton: React.FC<AddMLInferencePipelineButtonProps> = ({
  onClick,
}) => {
  const { capabilities } = useValues(KibanaLogic);
  const { canUseMlInferencePipeline, hasIndexIngestionPipeline } = useValues(PipelinesLogic);
  const hasMLPermissions = capabilities?.ml?.canAccessML ?? false;
  if (!hasMLPermissions) {
    return (
      <EuiToolTip
        content={i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.mlInference.addButton.mlPermissions.disabledTooltip',
          { defaultMessage: 'You do not have permission to Machine Learning on this cluster.' }
        )}
      >
        <AddButton disabled />
      </EuiToolTip>
    );
  }
  if (!hasIndexIngestionPipeline) {
    return (
      <EuiToolTip
        content={i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.mlInference.addButton.defaultIngestPipeline.disabledTooltip',
          {
            defaultMessage:
              'You cannot add machine learning inference pipeline processors to the default ingest pipeline. You must first copy and customize the default ingest pipeline to add machine learning inference pipeline processors.',
          }
        )}
      >
        <AddButton disabled />
      </EuiToolTip>
    );
  }
  if (!canUseMlInferencePipeline) {
    return (
      <EuiToolTip
        content={i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.mlInference.addButton.mlInferenceDisabled.disabledTooltip',
          {
            defaultMessage:
              'You must enable ML Inference Pipelines on the Ingest Pipeline to add ML Inference Pipeline Processors.',
          }
        )}
      >
        <AddButton disabled />
      </EuiToolTip>
    );
  }
  return <AddButton onClick={onClick} />;
};

const AddButton: React.FC<{ disabled?: boolean; onClick?: () => void }> = ({
  disabled,
  onClick,
}) => (
  <EuiButton color="success" disabled={disabled} iconType="plusInCircle" onClick={onClick}>
    {i18n.translate('xpack.enterpriseSearch.content.indices.pipelines.mlInference.addButtonLabel', {
      defaultMessage: 'Add inference pipeline',
    })}
  </EuiButton>
);
