/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../../shared/doc_links';

import { IndexViewLogic } from '../../index_view_logic';

import { InferenceConfiguration } from './inference_config';
import { MLInferenceLogic } from './ml_inference_logic';
import { TargetFieldHelpText } from './target_field_help_text';

const NoSourceFieldsError: React.FC = () => (
  <FormattedMessage
    id="xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.sourceField.error"
    defaultMessage="Selecting a source field is required for pipeline configuration, but this index does not have a field mapping. {learnMore}"
    values={{
      learnMore: (
        <EuiLink href={docLinks.elasticsearchMapping} target="_blank" color="danger">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.sourceField.error.docLink',
            { defaultMessage: 'Learn more about field mapping' }
          )}
        </EuiLink>
      ),
    }}
  />
);

export const ConfigureFields: React.FC = () => {
  const {
    addInferencePipelineModal: { configuration },
    formErrors,
    supportedMLModels,
    sourceFields,
  } = useValues(MLInferenceLogic);
  const { setInferencePipelineConfiguration } = useActions(MLInferenceLogic);
  const { ingestionMethod } = useValues(IndexViewLogic);

  const { destinationField, modelID, pipelineName, sourceField } = configuration;
  const emptySourceFields = (sourceFields?.length ?? 0) === 0;

  const inputsDisabled = configuration.existingPipeline !== false;
  const selectedModel = supportedMLModels.find((model) => model.model_id === modelID);

  return (
    <>
      <EuiTitle size="xs">
        <h4>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.title',
            { defaultMessage: 'Select field mappings' }
          )}
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText color="subdued">
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
      <EuiSpacer />
      <EuiForm component="form">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.sourceFieldLabel',
                {
                  defaultMessage: 'Source field',
                }
              )}
              error={emptySourceFields && <NoSourceFieldsError />}
              isInvalid={emptySourceFields}
            >
              <EuiSelect
                fullWidth
                data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-selectSchemaField`}
                disabled={inputsDisabled}
                value={sourceField}
                options={[
                  {
                    disabled: true,
                    text: i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.sourceField.placeholder',
                      { defaultMessage: 'Select a schema field' }
                    ),
                    value: '',
                  },
                  ...(sourceFields?.map((field) => ({
                    text: field,
                    value: field,
                  })) ?? []),
                ]}
                onChange={(e) =>
                  setInferencePipelineConfiguration({
                    ...configuration,
                    sourceField: e.target.value,
                  })
                }
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.targetField.label',
                {
                  defaultMessage: 'Target field (optional)',
                }
              )}
              helpText={
                formErrors.destinationField === undefined &&
                configuration.existingPipeline !== true && (
                  <TargetFieldHelpText
                    pipelineName={pipelineName}
                    targetField={destinationField}
                    model={selectedModel}
                  />
                )
              }
              error={formErrors.destinationField}
              isInvalid={formErrors.destinationField !== undefined}
              fullWidth
            >
              <EuiFieldText
                data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-targetField`}
                disabled={inputsDisabled}
                placeholder="custom_field_name"
                value={destinationField}
                onChange={(e) =>
                  setInferencePipelineConfiguration({
                    ...configuration,
                    destinationField: e.target.value,
                  })
                }
                fullWidth
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <InferenceConfiguration />
      </EuiForm>
    </>
  );
};
