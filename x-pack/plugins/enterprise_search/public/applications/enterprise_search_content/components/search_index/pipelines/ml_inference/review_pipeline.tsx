/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { MLInferenceLogic } from './ml_inference_logic';

export const ReviewPipeline: React.FC = () => {
  const { mlInferencePipeline } = useValues(MLInferenceLogic);
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={3}>
          <EuiTitle size="s">
            <h4>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.review.title',
                {
                  defaultMessage: 'Review your pipeline configuration',
                }
              )}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <EuiText color="subdued" size="s">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.review.description',
                {
                  defaultMessage:
                    "This pipeline will be created and injected as a processor into your default pipeline for this index. You'll be able to use this new pipeline independently as well.",
                }
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem grow>
          <EuiCodeBlock language="json" isCopyable overflowHeight="400px">
            {JSON.stringify(mlInferencePipeline ?? {}, null, 2)}
          </EuiCodeBlock>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
