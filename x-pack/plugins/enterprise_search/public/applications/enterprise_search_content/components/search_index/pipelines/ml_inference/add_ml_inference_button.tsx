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
import { IndexViewLogic } from '../../index_view_logic';
import { PipelinesLogic } from '../pipelines_logic';

export interface AddMLInferencePipelineButtonProps {
  onClick: () => void;
}
export const AddMLInferencePipelineButton: React.FC<AddMLInferencePipelineButtonProps> = ({
  onClick,
}) => {
  const { capabilities } = useValues(KibanaLogic);
  const { ingestionMethod } = useValues(IndexViewLogic);
  const { canUseMlInferencePipeline, hasIndexIngestionPipeline } = useValues(PipelinesLogic);
  const hasMLPermissions = capabilities?.ml?.canGetTrainedModels ?? false;
  if (!hasMLPermissions) {
    return (
      <EuiToolTip
        content={i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.mlInference.addButton.mlPermissions.disabledTooltip',
          { defaultMessage: 'You do not have permission to use Machine Learning on this cluster.' }
        )}
      >
        <AddButton ingestionMethod={ingestionMethod} disabled />
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
        <AddButton ingestionMethod={ingestionMethod} disabled />
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
        <AddButton ingestionMethod={ingestionMethod} disabled />
      </EuiToolTip>
    );
  }
  return <AddButton ingestionMethod={ingestionMethod} onClick={onClick} />;
};

const AddButton: React.FC<{
  disabled?: boolean;
  ingestionMethod: string;
  onClick?: () => void;
}> = ({ disabled, ingestionMethod, onClick }) => (
  <EuiButton
    fullWidth
    data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-addInferencePipeline`}
    color={disabled ? undefined : 'success'}
    disabled={disabled}
    iconType={disabled ? 'lock' : 'plusInCircle'}
    onClick={onClick}
  >
    {i18n.translate('xpack.enterpriseSearch.content.indices.pipelines.mlInference.addButtonLabel', {
      defaultMessage: 'Add Inference Pipeline',
    })}
  </EuiButton>
);
