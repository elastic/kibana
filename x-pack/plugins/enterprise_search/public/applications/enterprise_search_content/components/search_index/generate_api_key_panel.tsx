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
import { decodeCloudId } from '../../utils/decode_cloud_id';

import { DOCUMENTS_API_JSON_EXAMPLE } from '../new_index/constants';

import { ClientLibrariesPopover } from './components/client_libraries_popover/popover';
import { GenerateApiKeyModal } from './components/generate_api_key_modal/modal';
import { ManageKeysPopover } from './components/manage_api_keys_popover/popover';

import { OverviewLogic } from './overview.logic';

export const GenerateApiKeyPanel: React.FC = () => {
  const { apiKey, isGenerateModalOpen, indexData } = useValues(OverviewLogic);
  const { closeGenerateModal } = useActions(OverviewLogic);

  const cloudContext = useCloudDetails();

  const DEFAULT_URL = 'https://localhost:9200';
  const searchIndexApiUrl =
    (cloudContext.cloudId && decodeCloudId(cloudContext.cloudId)?.elasticsearchUrl) || DEFAULT_URL;

  const apiKeyExample = apiKey || '<Create an API Key>';

  return (
    <>
      {isGenerateModalOpen && (
        <GenerateApiKeyModal indexName={indexData?.name ?? ''} onClose={closeGenerateModal} />
      )}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel hasBorder>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                  <EuiFlexItem>
                    {indexData?.name[0] !== '.' && (
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
              {indexData?.name[0] !== '.' && (
                <>
                  <EuiSpacer />
                  <EuiFlexItem>
                    <EuiCodeBlock language="bash" fontSize="m" isCopyable>
                      {`\
curl -X POST '${searchIndexApiUrl}/${indexData?.name}/_doc' \\
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
  );
};
