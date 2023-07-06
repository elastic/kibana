/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import { useMlKibana } from '../../../contexts/kibana';

interface Props {
  inferencePipeline: IngestPipeline;
  modelType?: string;
  pipelineName: string;
  pipelineCreated: boolean;
  pipelineError?: string;
}

export const ReviewPipeline: FC<Props> = ({
  inferencePipeline,
  modelType,
  pipelineName,
  pipelineCreated,
  pipelineError,
}) => {
  const {
    services: {
      docLinks: { links },
    },
  } = useMlKibana();

  const inferenceProcessorLink =
    modelType === 'regression'
      ? links.ingest.inferenceRegression
      : links.ingest.inferenceClassification;

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={3}>
          {pipelineCreated === false ? (
            <EuiTitle size="s">
              <h4>
                {i18n.translate(
                  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.title',
                  {
                    defaultMessage: "Review the pipeline configuration for '{pipelineName}'",
                    values: { pipelineName },
                  }
                )}
              </h4>
            </EuiTitle>
          ) : null}
          <>
            <EuiSpacer size="s" />
            {pipelineCreated === true && pipelineError === undefined ? (
              <EuiCallOut
                title={i18n.translate(
                  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.create.successMessage',
                  {
                    defaultMessage: "'{pipelineName}' has been created successfully.",
                    values: { pipelineName },
                  }
                )}
                color="success"
                iconType="check"
              >
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.create.nextStepsMessage"
                    defaultMessage="You can now use this pipeline to infer against new ingested data or infer against existing data by {reindexLink} with the pipeline."
                    values={{
                      reindexLink: (
                        <EuiLink href={links.upgradeAssistant.reindexWithPipeline}>
                          {'reindexing'}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiCallOut>
            ) : null}
            {pipelineError !== undefined ? (
              <EuiCallOut
                title={i18n.translate(
                  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.create.failureMessage',
                  {
                    defaultMessage: "Sorry, unable to create '{pipelineName}'.",
                    values: { pipelineName },
                  }
                )}
                color="danger"
                iconType="error"
              >
                <p>{pipelineError}</p>
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.create.docLinkInErrorMessage"
                    defaultMessage="Learn more about {ingestPipelineConfigLink} and {inferencePipelineConfigLink} configuration."
                    values={{
                      ingestPipelineConfigLink: (
                        <EuiLink href={links.ingest.pipelines}>{'ingest pipeline'}</EuiLink>
                      ),
                      inferencePipelineConfigLink: (
                        <EuiLink href={modelType ? inferenceProcessorLink : links.ingest.inference}>
                          {'inference processor'}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiCallOut>
            ) : null}
          </>
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <EuiText color="subdued" size="s">
            <p>
              {!pipelineCreated ? (
                <FormattedMessage
                  id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.description"
                  defaultMessage="This pipeline will be created with the configuration below."
                />
              ) : null}
              {pipelineCreated
                ? i18n.translate(
                    'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.successDescription',
                    {
                      defaultMessage: 'The pipeline has been created with the configuration below.',
                    }
                  )
                : null}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem grow>
          <EuiCodeBlock language="json" isCopyable overflowHeight="400px">
            {JSON.stringify(inferencePipeline ?? {}, null, 2)}
          </EuiCodeBlock>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
