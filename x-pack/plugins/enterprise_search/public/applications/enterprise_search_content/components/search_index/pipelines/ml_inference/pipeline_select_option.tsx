/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTextColor, EuiTitle } from '@elastic/eui';

import { MLModelTypeBadge } from '../ml_model_type_badge';

import { MLInferencePipelineOption } from './ml_inference_logic';
import { EXISTING_PIPELINE_DISABLED_MISSING_SOURCE_FIELDS, MODEL_REDACTED_VALUE } from './utils';

export interface PipelineSelectOptionProps {
  checked?: 'on';
  disabled?: boolean;
  label: string;
  pipeline: MLInferencePipelineOption;
}

export const PipelineSelectOptionDisabled: React.FC<{ disabledReason?: string }> = ({
  disabledReason,
}) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="warning" color="warning" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTextColor color="warning">
          {disabledReason ?? EXISTING_PIPELINE_DISABLED_MISSING_SOURCE_FIELDS}
        </EuiTextColor>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const PipelineSelectOption: React.FC<PipelineSelectOptionProps> = ({ pipeline }) => {
  const modelIdDisplay = pipeline.modelId.length > 0 ? pipeline.modelId : MODEL_REDACTED_VALUE;
  return (
    // TODO: Verify text size
    // TODO: Add status & action menu
    // TODO: Test rendering when pipeline.modelType.length == 0
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h4>{pipeline.pipelineName}</h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiText size="s">{modelIdDisplay}</EuiText>
          </EuiFlexItem>
          {pipeline.modelType.length > 0 && (
            <EuiFlexItem grow={false}>
              {/* Wrap in a div to prevent the badge from growing to a whole row on mobile*/}
              <div>
                <MLModelTypeBadge type={pipeline.modelType} />
              </div>
            </EuiFlexItem>
          )}
          <EuiFlexItem />
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        {pipeline.disabled ? (
          <PipelineSelectOptionDisabled disabledReason={pipeline.disabledReason} />
        ) : (
          <EuiText size="s">{pipeline.sourceFields.join(', ')}</EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>

    // <EuiFlexGroup direction="column" gutterSize="none">
    //   <EuiFlexItem>
    //     <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
    //       <EuiFlexItem>
    //         <EuiTitle size="xs">
    //           <h4>{pipeline.pipelineName}</h4>
    //         </EuiTitle>
    //       </EuiFlexItem>
    //       {pipeline.modelType.length > 0 && (
    //         <EuiFlexItem grow={false}>
    //           <MLModelTypeBadge type={pipeline.modelType} />
    //         </EuiFlexItem>
    //       )}
    //     </EuiFlexGroup>
    //   </EuiFlexItem>
    //   <EuiSpacer size="m" />
    //   <EuiFlexItem>
    //     <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
    //       <EuiFlexItem>
    //         <EuiText size="s" color="subdued">
    //           {i18n.translate(
    //             'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.existingPipeline.model',
    //             { defaultMessage: 'Model' }
    //           )}
    //         </EuiText>
    //       </EuiFlexItem>
    //       <EuiFlexItem grow={false}>
    //         <EuiText size="s" color={pipeline.disabled ? 'subdued' : 'normal'}>
    //           {modelIdDisplay}
    //         </EuiText>
    //       </EuiFlexItem>
    //     </EuiFlexGroup>
    //   </EuiFlexItem>
    //   <EuiSpacer size="xs" />
    //   <EuiFlexItem>
    //     <EuiFlexGroup>
    //       <EuiFlexItem style={{ minWidth: 100 }}>
    //         <EuiText size="s" color="subdued">
    //           {i18n.translate(
    //             'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.existingPipeline.sourceFields',
    //             { defaultMessage: 'Source fields' }
    //           )}
    //         </EuiText>
    //       </EuiFlexItem>
    //       <EuiFlexItem grow={false}>
    //         <EuiText size="s" color={pipeline.disabled ? 'subdued' : 'normal'} textAlign="right">
    //           {pipeline.sourceFields.join(', ')}
    //         </EuiText>
    //       </EuiFlexItem>
    //     </EuiFlexGroup>
    //   </EuiFlexItem>
    //   <EuiSpacer size="s" />
    //   {pipeline.disabled && (
    //     <PipelineSelectOptionDisabled disabledReason={pipeline.disabledReason} />
    //   )}
    // </EuiFlexGroup>
  );
};
