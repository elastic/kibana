/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { IngestPipelineParams } from '@kbn/search-connectors';

import { ElasticsearchIndexWithIngestion } from '../../../../../../../common/types/indices';

import { isApiIndex } from '../../../../utils/indices';
import { CurlRequest } from '../../components/curl_request/curl_request';

export const DefaultPipelineItem: React.FC<{
  index: ElasticsearchIndexWithIngestion;
  indexName: string;
  ingestionMethod: string;
  openPipelineSettings: () => void;
  pipelineName: string;
  pipelineState: IngestPipelineParams;
}> = ({ index, indexName, ingestionMethod, openPipelineSettings, pipelineName, pipelineState }) => {
  /**
   * If we don't open the accordion on load, the curl code never shows the copy button
   * Because if the accordion is closed, the code block is not present in the DOM
   * And EuiCodeBlock doesn't show the copy button if it's virtualized (ie not present in DOM)
   * It doesn't re-evaluate whether it's present in DOM if the inner text doesn't change
   * Opening and closing makes sure it's present in DOM on initial load, so the copy button shows
   * We use setImmediate to then close it on the next javascript loop
   */
  const [accordionOpen, setAccordionOpen] = useState<boolean>(true);
  useEffect(() => {
    setImmediate(() => setAccordionOpen(false));
  }, []);

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
              onClick={openPipelineSettings}
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
                forceState={accordionOpen ? 'open' : 'closed'}
                onClick={() => setAccordionOpen(!accordionOpen)}
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
              <EuiBadge color="hollow" iconType="lock">
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
