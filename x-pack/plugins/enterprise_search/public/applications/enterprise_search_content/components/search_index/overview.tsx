/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { Status } from '../../../../../common/types/api';
import { getEnterpriseSearchUrl } from '../../../shared/enterprise_search_url/external_url';

import { FetchIndexApiLogic } from '../../api/index/fetch_index_api_logic';
import { DOCUMENTS_API_JSON_EXAMPLE } from '../new_index/constants';

import { GenerateApiKeyModal } from './components/generate_api_key_modal/modal';
import { TotalStats } from './total_stats';

export const SearchIndexOverview: React.FC = () => {
  const { data, status } = useValues(FetchIndexApiLogic);

  const searchIndexApiUrl = getEnterpriseSearchUrl('/api/ent/v1/search_indices/');
  const apiKey = 'Create an API Key';

  return (
    <>
      {data && <GenerateApiKeyModal indexName={data.index.name} />}
      {status === Status.SUCCESS && data && (
        <>
          <EuiSpacer />
          <TotalStats
            lastUpdated={'TODO'}
            documentCount={data.index.total.docs.count ?? 0}
            indexHealth={data.index.health ?? ''}
            ingestionType={data.connector ? 'Connector' : data.crawler ? 'Crawler' : 'API'}
          />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiPanel>
                <EuiFlexGroup direction="column">
                  <EuiFlexItem>
                    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                      <EuiFlexItem>
                        <EuiTitle size="s">
                          <h2>Adding documents to your index</h2>
                        </EuiTitle>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
                          <EuiFlexItem>
                            <EuiButton iconType="arrowDown" iconSide="right">
                              Client Libraries
                            </EuiButton>
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <EuiButton fill>Generate an API key</EuiButton>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiSpacer />
                  <EuiFlexItem>
                    <EuiCodeBlock language="bash" fontSize="m" isCopyable>
                      {`\
curl -X POST '${searchIndexApiUrl}${data.index?.name}/document' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${apiKey}' \\
  -d '${JSON.stringify(DOCUMENTS_API_JSON_EXAMPLE, null, 2)}'
`}
                    </EuiCodeBlock>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
