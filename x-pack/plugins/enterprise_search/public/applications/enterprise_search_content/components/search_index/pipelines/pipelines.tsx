/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DataPanel } from '../../../../shared/data_panel/data_panel';
import { docLinks } from '../../../../shared/doc_links';
import { isApiIndex } from '../../../utils/indices';

import { InferenceErrors } from './inference_errors';
import { InferenceHistory } from './inference_history';
import { IngestPipelinesCard } from './ingest_pipelines/ingest_pipelines_card';
import { AddInferencePipelineFlyout } from './ml_inference/add_inference_pipeline_flyout';
import { AddMLInferencePipelineButton } from './ml_inference/add_ml_inference_button';
import { MlInferencePipelineProcessorsCard } from './ml_inference_pipeline_processors_card';
import { PipelinesJSONConfigurations } from './pipelines_json_configurations';
import { PipelinesLogic } from './pipelines_logic';

export const SearchIndexPipelines: React.FC = () => {
  const { showAddMlInferencePipelineModal, hasIndexIngestionPipeline, index, pipelineName } =
    useValues(PipelinesLogic);
  const { closeAddMlInferencePipelineModal, openAddMlInferencePipelineModal } =
    useActions(PipelinesLogic);
  const apiIndex = isApiIndex(index);

  const pipelinesTabs: EuiTabbedContentTab[] = [
    {
      content: <InferenceHistory />,
      id: 'inference-history',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.inferenceHistory',
        {
          defaultMessage: 'Inference history',
        }
      ),
    },
    {
      content: <PipelinesJSONConfigurations />,
      id: 'json-configurations',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations',
        {
          defaultMessage: 'JSON configurations',
        }
      ),
    },
  ];

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup direction="row" wrap>
        <EuiFlexItem grow={5}>
          <DataPanel
            hasBorder
            footerDocLink={
              <EuiLink href={docLinks.ingestPipelines} target="_blank" color="subdued">
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
            subtitle={
              apiIndex
                ? i18n.translate(
                    'xpack.enterpriseSearch.content.indices.pipelines.ingestionPipeline.apiIndexSubtitle',
                    {
                      defaultMessage:
                        "Ingest pipelines optimize your index for search applications. If you'd like to use these pipelines in your API-based index, you'll need to reference them explicitly in your API requests.",
                    }
                  )
                : i18n.translate(
                    'xpack.enterpriseSearch.content.indices.pipelines.ingestionPipeline.subtitle',
                    {
                      defaultMessage:
                        'Ingest pipelines optimize your index for search applications',
                    }
                  )
            }
            iconType="logstashInput"
          >
            <IngestPipelinesCard />
          </DataPanel>
          <EuiSpacer />
          <DataPanel
            hasBorder
            footerDocLink={
              <EuiLink href={docLinks.deployTrainedModels} target="_blank" color="subdued">
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.mlInferencePipelines.docLink',
                  {
                    defaultMessage: 'Learn more about deploying Machine Learning models in Elastic',
                  }
                )}
              </EuiLink>
            }
            title={
              <h2>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.mlInferencePipelines.title',
                  {
                    defaultMessage: 'Machine Learning Inference Pipelines',
                  }
                )}
              </h2>
            }
            subtitle={
              apiIndex && hasIndexIngestionPipeline
                ? i18n.translate(
                    'xpack.enterpriseSearch.content.indices.pipelines.mlInferencePipelines.subtitleAPIindex',
                    {
                      defaultMessage:
                        "Inference pipelines will be run as processors from the Enterprise Search Ingest Pipeline. In order to use these pipelines on API-based indices you'll need to reference the {pipelineName} pipeline in your API requests.",
                      values: {
                        pipelineName,
                      },
                    }
                  )
                : i18n.translate(
                    'xpack.enterpriseSearch.content.indices.pipelines.mlInferencePipelines.subtitle',
                    {
                      defaultMessage:
                        'Inference pipelines will be run as processors from the Enterprise Search Ingest Pipeline',
                    }
                  )
            }
            iconType="compute"
            action={
              <AddMLInferencePipelineButton onClick={() => openAddMlInferencePipelineModal()} />
            }
          >
            <MlInferencePipelineProcessorsCard />
          </DataPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={5}>
          <EuiPanel color="subdued">
            <EuiTabbedContent
              tabs={pipelinesTabs}
              initialSelectedTab={pipelinesTabs[0]}
              autoFocus="selected"
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <InferenceErrors />
      {showAddMlInferencePipelineModal && (
        <AddInferencePipelineFlyout onClose={closeAddMlInferencePipelineModal} />
      )}
    </>
  );
};
