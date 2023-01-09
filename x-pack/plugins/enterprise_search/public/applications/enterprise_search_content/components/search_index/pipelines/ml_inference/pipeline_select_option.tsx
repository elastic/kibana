/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTextColor, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { MLInferencePipelineOption } from './ml_inference_logic';
import { EXISTING_PIPELINE_DISABLED_MISSING_SOURCE_FIELD, MODEL_REDACTED_VALUE } from './utils';

export interface PipelineSelectOptionProps {
  pipeline: MLInferencePipelineOption;
}

export const PipelineSelectOption: React.FC<PipelineSelectOptionProps> = ({ pipeline }) => {
  const modelIdDisplay = pipeline.modelId.length > 0 ? pipeline.modelId : MODEL_REDACTED_VALUE;
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {pipeline.disabled && (
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiIcon type="alert" color="warning" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTextColor color="default">
                {pipeline.disabledReason ?? EXISTING_PIPELINE_DISABLED_MISSING_SOURCE_FIELD}
              </EuiTextColor>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h4>{pipeline.pipelineName}</h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
          <EuiFlexItem>
            {pipeline.disabled ? (
              modelIdDisplay
            ) : (
              <EuiTextColor color="subdued">{modelIdDisplay}</EuiTextColor>
            )}
          </EuiFlexItem>
          {pipeline.modelType.length > 0 && (
            <EuiFlexItem grow={false}>
              <span>
                <EuiBadge color="hollow">{pipeline.modelType}</EuiBadge>
              </span>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem>
            <strong>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.existingPipeline.sourceField',
                { defaultMessage: 'Source field' }
              )}
            </strong>
          </EuiFlexItem>
          <EuiFlexItem>{pipeline.sourceField}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem>
            <strong>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.existingPipeline.destinationField',
                { defaultMessage: 'Destination field' }
              )}
            </strong>
          </EuiFlexItem>
          <EuiFlexItem>{pipeline.destinationField}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
