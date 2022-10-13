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
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../../shared/doc_links';

import { IndexViewLogic } from '../../index_view_logic';

import { MLInferenceLogic } from './ml_inference_logic';

const NoSourceFieldsError: React.FC = () => (
  <FormattedMessage
    id="xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.sourceField.error"
    defaultMessage="Selecting a source field is required for pipeline configuration, but this index does not have a field mapping. {learnMore}"
    values={{
      learnMore: (
        <EuiLink href={docLinks.elasticsearchMapping} target="_blank" color="danger">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.sourceField.error.docLink',
            { defaultMessage: 'Learn more about field mapping' }
          )}
        </EuiLink>
      ),
    }}
  />
);

export const ConfigurePipeline: React.FC = () => {
  const {
    addInferencePipelineModal: { configuration },
    formErrors,
    supportedMLModels,
    sourceFields,
  } = useValues(MLInferenceLogic);
  const { setInferencePipelineConfiguration } = useActions(MLInferenceLogic);
  const { ingestionMethod } = useValues(IndexViewLogic);

  const { destinationField, modelID, pipelineName, sourceField } = configuration;
  const models = supportedMLModels ?? [];
  const nameError = formErrors.pipelineName !== undefined && pipelineName.length > 0;
  const emptySourceFields = (sourceFields?.length ?? 0) === 0;

  return (
    <>
      <EuiText color="subdued">
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.description',
            {
              defaultMessage:
                "Once created, this pipeline will be added as a processor on your Enterprise Search Ingestion Pipeline. You'll also be able to use this pipeline elsewhere in your Elastic deployment.",
            }
          )}
        </p>
        <EuiLink href={docLinks.deployTrainedModels} target="_blank">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.docsLink',
            {
              defaultMessage: 'Learn more about using ML models in Enterprise Search',
            }
          )}
        </EuiLink>
      </EuiText>
      <EuiSpacer />
      <EuiForm component="form">
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.nameLabel',
            {
              defaultMessage: 'Name',
            }
          )}
          helpText={
            !nameError &&
            i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.name.helpText',
              {
                defaultMessage:
                  'Pipeline names are unique within a deployment and can only contain letters, numbers, underscores, and hyphens. The pipeline name will be automatically prefixed with "ml-inference-".',
              }
            )
          }
          error={nameError && formErrors.pipelineName}
          isInvalid={nameError}
        >
          <EuiFieldText
            data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-uniqueName`}
            fullWidth
            placeholder={i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.namePlaceholder',
              {
                defaultMessage: 'Enter a unique name for this pipeline',
              }
            )}
            value={pipelineName}
            onChange={(e) =>
              setInferencePipelineConfiguration({
                ...configuration,
                pipelineName: e.target.value,
              })
            }
          />
        </EuiFormRow>
        <EuiSpacer />
        <EuiFormRow
          label={i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.modelLabel',
            {
              defaultMessage: 'Select a trained ML Model',
            }
          )}
          fullWidth
        >
          <EuiSelect
            data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-selectTrainedModel`}
            fullWidth
            value={modelID}
            options={[
              {
                disabled: true,
                text: i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.model.placeholder',
                  { defaultMessage: 'Select a model' }
                ),
                value: '',
              },
              ...models.map((m) => ({ text: m.model_id, value: m.model_id })),
            ]}
            onChange={(e) =>
              setInferencePipelineConfiguration({
                ...configuration,
                modelID: e.target.value,
              })
            }
          />
        </EuiFormRow>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.sourceFieldLabel',
                {
                  defaultMessage: 'Source field',
                }
              )}
              error={emptySourceFields && <NoSourceFieldsError />}
              isInvalid={emptySourceFields}
            >
              <EuiSelect
                data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-selectSchemaField`}
                value={sourceField}
                options={[
                  {
                    disabled: true,
                    text: i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.sourceField.placeholder',
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
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.destinationField.label',
                {
                  defaultMessage: 'Destination field (optional)',
                }
              )}
              helpText={
                formErrors.destinationField === undefined &&
                i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.destinationField.helpText',
                  {
                    defaultMessage:
                      'Your field name will be prefixed with "ml.inference.", if not set it will be defaulted to "ml.inference.{pipelineName}"',
                    values: {
                      pipelineName,
                    },
                  }
                )
              }
              error={formErrors.destinationField}
              isInvalid={formErrors.destinationField !== undefined}
            >
              <EuiFieldText
                data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-destionationField`}
                placeholder="custom_field_name"
                value={destinationField}
                onChange={(e) =>
                  setInferencePipelineConfiguration({
                    ...configuration,
                    destinationField: e.target.value,
                  })
                }
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </>
  );
};
