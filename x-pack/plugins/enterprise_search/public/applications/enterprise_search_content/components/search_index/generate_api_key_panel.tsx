/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiButtonIcon,
  EuiButton,
  EuiCodeBlock,
} from '@elastic/eui';

import { getEnterpriseSearchUrl } from '../../../shared/enterprise_search_url';
import { DOCUMENTS_API_JSON_EXAMPLE } from '../new_index/constants';

export const GenerateApiKeyPanel: React.FC = () => {
  const searchIndexApiUrl = getEnterpriseSearchUrl('/api/ent/v1/search_indices/');
  const apiKey = 'Create an API Key';

  return (
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
  );
};
