/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DataPanel } from '../../../../shared/data_panel/data_panel';

import { InferencePipelineCard } from './inference_pipeline_card';
import { InferencePipeline } from './types';

export const SearchIndexPipelines: React.FC = () => {
  // TODO: REPLACE THIS DATA WITH REAL DATA

  const inferencePipelines: InferencePipeline[] = [
    {
      pipelineName: 'NER Processor',
      trainedModelName: 'elastic_dslim_bert_base_ner',
      isDeployed: true,
      modelType: 'pytorch',
    },
    {
      pipelineName: 'Sentiment Analysis',
      trainedModelName: 'elastic_dslim_bert_base_ner',
      isDeployed: false,
      modelType: 'pytorch',
    },
    {
      pipelineName: 'Sentiment Analysis',
      trainedModelName: 'elastic_dslim_bert_base_ner',
      isDeployed: false,
      modelType: 'pytorch',
    },
  ];

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <DataPanel
            hasBorder
            footerDocLink={
              <EuiLink href="" external color="subdued">
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.ingestionPipeline.docLink',
                  {
                    defaultMessage: 'Learn more about using pipelines in Enterprise Search',
                  }
                )}
              </EuiLink>
            }
            title={
              <h2>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.ingestionPipeline.title',
                  {
                    defaultMessage: 'Ingest Pipelines',
                  }
                )}
              </h2>
            }
            subtitle={i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.ingestionPipeline.subtitle',
              {
                defaultMessage: 'Ingest pipelines optimize your index for search applications',
              }
            )}
            iconType="logstashInput"
          >
            <div />
          </DataPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <DataPanel
            hasBorder
            footerDocLink={
              <EuiLink href="" external color="subdued">
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.mlInferencePipelines.docLink',
                  {
                    defaultMessage: 'Learn more about deploying ML models in Elastic',
                  }
                )}
              </EuiLink>
            }
            title={
              <h2>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.mlInferencePipelines.title',
                  {
                    defaultMessage: 'ML Inference pipelines',
                  }
                )}
              </h2>
            }
            subtitle={i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.mlInferencePipelines.subtitle',
              {
                defaultMessage:
                  'Inference pipelines will be run as processors from the Enterprise Search Ingest Pipeline',
              }
            )}
            iconType="compute"
            action={
              <EuiButton color="success" size="s" iconType="plusInCircle">
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.mlInferencePipelines.newButton',
                  {
                    defaultMessage: 'Add ML inference pipeline',
                  }
                )}
              </EuiButton>
            }
          >
            {inferencePipelines.length > 0 && (
              <EuiFlexGroup direction="column" gutterSize="s">
                {inferencePipelines.map((item: InferencePipeline, index: number) => (
                  <EuiFlexItem key={index}>
                    <InferencePipelineCard
                      trainedModelName={item.trainedModelName}
                      pipelineName={item.pipelineName}
                      isDeployed={item.isDeployed}
                      modelType={item.modelType}
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            )}
          </DataPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
