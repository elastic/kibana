/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { IngestPipelineParams } from '../../../../../../../common/types/connectors';
import { ElasticsearchIndexWithIngestion } from '../../../../../../../common/types/indices';

import { isApiIndex } from '../../../../utils/indices';
import { CurlRequest } from '../../components/curl_request/curl_request';

export const DefaultPipelineItem: React.FC<{
  index: ElasticsearchIndexWithIngestion;
  indexName: string;
  ingestionMethod: string;
  openModal: () => void;
  pipelineName: string;
  pipelineState: IngestPipelineParams;
}> = ({ index, indexName, ingestionMethod, openModal, pipelineName, pipelineState }) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>{pipelineName}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-settings`}
              onClick={openModal}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.ingestPipelinesCard.settings.label',
                { defaultMessage: 'Settings' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd">
          {isApiIndex(index) && (
            <EuiFlexItem>
              <EuiAccordion
                data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-viewCurlRequest`}
                buttonContent={i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.ingestPipelinesCard.accordion.label',
                  { defaultMessage: 'Ingest a document using cURL' }
                )}
                id="ingestPipelinesCurlAccordion"
              >
                <CurlRequest
                  document={{ body: 'body', title: 'Title' }}
                  indexName={indexName}
                  pipeline={{ ...pipelineState, name: pipelineName }}
                />
              </EuiAccordion>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <span>
              <EuiBadge color="hollow">
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.ingestPipelinesCard.managedBadge.label',
                  { defaultMessage: 'Managed' }
                )}
              </EuiBadge>
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
