/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DataPanel } from '../../../../shared/data_panel/data_panel';

import { IngestPipelinesCard } from './ingest_pipelines_card';
import { AddMLInferencePipelineButton } from './ml_inference/add_ml_inference_button';
import { AddMLInferencePipelineModal } from './ml_inference/add_ml_inference_pipeline_modal';
import { MlInferencePipelineProcessorsCard } from './ml_inference_pipeline_processors_card';
import { PipelinesLogic } from './pipelines_logic';

export const SearchIndexPipelines: React.FC = () => {
  const { showAddMlInferencePipelineModal } = useValues(PipelinesLogic);
  const { closeAddMlInferencePipelineModal, openAddMlInferencePipelineModal } =
    useActions(PipelinesLogic);

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
            <IngestPipelinesCard />
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
              <AddMLInferencePipelineButton onClick={() => openAddMlInferencePipelineModal()} />
            }
          >
            <MlInferencePipelineProcessorsCard />
          </DataPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      {showAddMlInferencePipelineModal && (
        <AddMLInferencePipelineModal onClose={closeAddMlInferencePipelineModal} />
      )}
    </>
  );
};
