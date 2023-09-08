/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiForm, EuiSpacer, EuiTitle, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { InferenceConfiguration } from './inference_config';
import { MLInferenceLogic } from './ml_inference_logic';
import { MultiFieldMapping, SelectedFieldMappings } from './multi_field_selector';

export const ConfigureFields: React.FC = () => {
  const {
    addInferencePipelineModal: { configuration },
  } = useValues(MLInferenceLogic);
  const areInputsDisabled = configuration.existingPipeline !== false;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={3}>
          <EuiTitle size="s">
            <h4>
              {areInputsDisabled ? (
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.titleReview"
                  defaultMessage="Review field mappings"
                />
              ) : (
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.title"
                  defaultMessage="Select field mappings"
                />
              )}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <EuiText color="subdued" size="s">
            <p>
              {areInputsDisabled ? (
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.descriptionReview"
                  defaultMessage="Examine the field mappings of your chosen pipeline to ensure that the source and target fields align with your specific use case. {notEditable}"
                  values={{
                    notEditable: (
                      <strong>
                        <FormattedMessage
                          id="xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.descriptionReviewNotEditable"
                          defaultMessage="The fields from existing pipelines are not editable."
                        />
                      </strong>
                    ),
                  }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.description"
                  defaultMessage="Choose fields to be enhanced from your existing documents or manually enter in fields you anticipate using."
                />
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiForm component="form">
        {areInputsDisabled || (
          <>
            <MultiFieldMapping />
            <EuiSpacer size="s" />
          </>
        )}
        <SelectedFieldMappings isReadOnly={areInputsDisabled} />
        <InferenceConfiguration />
      </EuiForm>
    </>
  );
};
