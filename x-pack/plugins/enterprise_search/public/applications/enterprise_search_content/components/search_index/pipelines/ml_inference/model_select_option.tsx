/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiTextColor, EuiTitle } from '@elastic/eui';
import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

import { getMlModelTypesForModelConfig } from '../../../../../../../common/ml_inference_pipeline';
import { getMLType, getModelDisplayTitle } from '../../../shared/ml_inference/utils';

export interface MlModelSelectOptionProps {
  model: TrainedModelConfigResponse;
}
export const MlModelSelectOption: React.FC<MlModelSelectOptionProps> = ({ model }) => {
  const type = getMLType(getMlModelTypesForModelConfig(model));
  const title = getModelDisplayTitle(type);
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h4>{title ?? model.model_id}</h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
          {title && (
            <EuiFlexItem>
              <EuiTextColor color="subdued">{model.model_id}</EuiTextColor>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <span>
              <EuiBadge color="hollow">{type}</EuiBadge>
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
