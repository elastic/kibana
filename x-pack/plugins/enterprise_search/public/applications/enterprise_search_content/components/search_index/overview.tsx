/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiCodeBlock,
  EuiText,
  EuiFlexGroup,
  EuiButton,
  EuiButtonIcon,
  EuiFlexItem,
  EuiPanel,
  EuiTabs,
  EuiTab,
  EuiSpacer,
} from '@elastic/eui';

import { getEnterpriseSearchUrl } from '../../../shared/enterprise_search_url/external_url';

import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';
import { DOCUMENTS_API_JSON_EXAMPLE } from '../new_index/constants';

import { TotalStats } from './total_stats';

export const SearchIndexOverview: React.FC = () => {
  const [tabIndex, setSelectedTabIndex] = useState(0);
  const searchIndexApiUrl = getEnterpriseSearchUrl('/api/ent/v1/search_indices/');
  const apiKey = 'Create an API Key';

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[]}
      pageViewTelemetry="Overview"
      isLoading={false}
      pageHeader={{ pageTitle: 'my-cool-index-name' }}
    >
      <EuiTabs bottomBorder expand size="xl">
        <EuiTab isSelected={tabIndex === 0} onClick={() => setSelectedTabIndex(0)}>
          Overview
        </EuiTab>
        <EuiTab isSelected={tabIndex === 1} onClick={() => setSelectedTabIndex(1)}>
          Document explorer
        </EuiTab>
        <EuiTab isSelected={tabIndex === 2} onClick={() => setSelectedTabIndex(2)}>
          Index mappings
        </EuiTab>
        <EuiTab isSelected={tabIndex === 3} onClick={() => setSelectedTabIndex(3)}>
          Configuration
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size="l" />
      <TotalStats />
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
    </EnterpriseSearchContentPageTemplate>
  );
};
