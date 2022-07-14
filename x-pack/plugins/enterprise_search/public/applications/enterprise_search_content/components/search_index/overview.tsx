/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useCloudDetails } from '../../../shared/cloud_details/cloud_details';

import { DOCUMENTS_API_JSON_EXAMPLE } from '../new_index/constants';

import { ClientLibrariesPopover } from './components/client_libraries_popover/popover';
import { GenerateApiKeyModal } from './components/generate_api_key_modal/modal';
import { ManageKeysPopover } from './components/manage_api_keys_popover/popover';

import { CrawlDetailsFlyout } from './crawler/crawl_details_flyout/crawl_details_flyout';
import { CrawlRequestsPanel } from './crawler/crawl_requests_panel/crawl_requests_panel';
import { GenerateApiKeyPanel } from './generate_api_key_panel';
import { OverviewLogic } from './overview.logic';
import { TotalStats } from './total_stats';

const getDeploymentUrls = (cloudId: string) => {
  const [host, kibanaHost, elasticHost] = window.atob(cloudId);
  return {
    elasticUrl: `https://${elasticHost}.${host}`,
    kibanaUrl: `https://${kibanaHost}.${host}`,
  };
};

export const SearchIndexOverview: React.FC = () => {
  const cloudContext = useCloudDetails();
  const { apiKey, isGenerateModalOpen, indexData, isSuccess } = useValues(OverviewLogic);
  const { closeGenerateModal } = useActions(OverviewLogic);

  const isCrawler = typeof indexData?.crawler !== 'undefined';
  const isConnector = typeof indexData?.connector !== 'undefined';
  const isApi = !(isCrawler || isConnector);

  const searchIndexApiUrl = cloudContext.cloudId
    ? getDeploymentUrls(cloudContext.cloudId).elasticUrl
    : `http://${window.location.hostname}:9200/`; // TODO change

  const apiKeyExample = apiKey || '<Create an API Key>';

  return (
    <>
      <EuiSpacer />
      {isApi && <GenerateApiKeyPanel />}

      {isApi && isGenerateModalOpen && (
        <GenerateApiKeyModal indexName={indexData.index.name} onClose={closeGenerateModal} />
      )}
      {isCrawler && (
        <>
          <CrawlRequestsPanel />
          <CrawlDetailsFlyout />
        </>
      )}
      {isSuccess && (
        <>
          <EuiSpacer />
          <TotalStats
            documentCount={indexData.index.total.docs.count ?? 0}
            indexHealth={indexData.index.health ?? ''}
            ingestionType={
              indexData.connector ? 'Connector' : indexData.crawler ? 'Crawler' : 'API'
            }
          />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiPanel>
                <EuiFlexGroup direction="column">
                  <EuiFlexItem>
                    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                      <EuiFlexItem>
                        {indexData.index.name[0] !== '.' && (
                          <EuiTitle size="s">
                            <h2>
                              {i18n.translate(
                                'xpack.enterpriseSearch.content.overview.documentExample.title',
                                { defaultMessage: 'Adding documents to your index' }
                              )}
                            </h2>
                          </EuiTitle>
                        )}
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
                          <EuiFlexItem>
                            <ClientLibrariesPopover />
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <ManageKeysPopover />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  {indexData.index.name[0] !== '.' && (
                    <>
                      <EuiSpacer />
                      <EuiFlexItem>
                        <EuiCodeBlock language="bash" fontSize="m" isCopyable>
                          {`\
curl -X POST '${searchIndexApiUrl}${indexData.index.name}/_doc' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: ApiKey ${apiKeyExample}' \\
  -d '${JSON.stringify(DOCUMENTS_API_JSON_EXAMPLE, null, 2)}'
`}
                        </EuiCodeBlock>
                      </EuiFlexItem>
                    </>
                  )}
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
