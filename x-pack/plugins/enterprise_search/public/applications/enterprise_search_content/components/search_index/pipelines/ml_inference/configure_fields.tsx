/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiForm, EuiSpacer, EuiTitle, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { InferenceConfiguration } from './inference_config';
import { MLInferenceLogic } from './ml_inference_logic';
import { MultiFieldMapping, SelectedFieldMappings } from './multi_field_selector';
import { SingleFieldMapping } from './single_field_selector';

export const ConfigureFields: React.FC = () => {
  const { isTextExpansionModelSelected } = useValues(MLInferenceLogic);
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={3}>
          <EuiTitle size="s">
            <h4>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.title',
                { defaultMessage: 'Select field mappings' }
              )}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <EuiText color="subdued" size="s">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.description',
                {
                  defaultMessage:
                    'Choose fields to be enhanced from your existing documents or manually enter in fields you anticipate using.',
                }
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiForm component="form">
        {isTextExpansionModelSelected ? (
          <>
            <MultiFieldMapping />
            <SelectedFieldMappings />
          </>
        ) : (
          <>
            <SingleFieldMapping />
            <InferenceConfiguration />
          </>
        )}
      </EuiForm>
    </>
  );
};
