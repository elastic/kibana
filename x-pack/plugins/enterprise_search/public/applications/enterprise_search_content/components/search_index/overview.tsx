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
  EuiText,
  EuiFlexGroup,
  EuiButton,
  EuiButtonIcon,
  EuiFlexItem,
  EuiPanel,
} from '@elastic/eui';

import { Status } from '../../../../../common/types/api';
import { getEnterpriseSearchUrl } from '../../../shared/enterprise_search_url/external_url';

import { FetchIndexApiLogic } from '../../api/index/fetch_index_api_logic';
import { DOCUMENTS_API_JSON_EXAMPLE } from '../new_index/constants';

import { TotalStats } from './total_stats';

export const SearchIndexOverview: React.FC = () => {
  const { data, status } = useValues(FetchIndexApiLogic);

  const searchIndexApiUrl = getEnterpriseSearchUrl('/api/ent/v1/search_indices/');
  const apiKey = 'Create an API Key';

  return (
    <>
      {status === Status.SUCCESS && data && (
        <TotalStats
          lastUpdated={'TODO'}
          documentCount={data.index.total.docs.count ?? 0}
          indexHealth={data.index.health ?? ''}
          ingestionType={data.connector ? 'Connector' : data.crawler ? 'Crawler' : 'API'}
        />
      )}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                  <EuiFlexItem>
                    <EuiText>
                      <h2>Indexing by API</h2>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
                      <EuiFlexItem>
                        <EuiButtonIcon iconType="iInCircle" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiButton>Generate an API key</EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCodeBlock language="bash" fontSize="m" isCopyable>
                  {`\
curl -X POST '${searchIndexApiUrl}${name}/document' \\
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
  );
};
