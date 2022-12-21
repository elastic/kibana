/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiSwitch, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DOCUMENTS_API_JSON_EXAMPLE } from '../new_index/constants';

import { SettingsLogic } from '../settings/settings_logic';

import { ClientLibrariesPopover } from './components/client_libraries_popover/popover';
import { CurlRequest } from './components/curl_request/curl_request';
import { GenerateApiKeyModal } from './components/generate_api_key_modal/modal';
import { ManageKeysPopover } from './components/manage_api_keys_popover/popover';

import { IndexViewLogic } from './index_view_logic';
import { OverviewLogic } from './overview.logic';

export const GenerateApiKeyPanel: React.FC = () => {
  const { apiKey, isGenerateModalOpen } = useValues(OverviewLogic);
  const { indexName, ingestionMethod } = useValues(IndexViewLogic);
  const { closeGenerateModal } = useActions(OverviewLogic);
  const { defaultPipeline } = useValues(SettingsLogic);

  const [optimizedRequest, setOptimizedRequest] = useState(true);

  return (
    <>
      {isGenerateModalOpen && (
        <GenerateApiKeyModal indexName={indexName} onClose={closeGenerateModal} />
      )}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel hasBorder>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                  <EuiFlexItem>
                    {indexName[0] !== '.' && (
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
                    <EuiSwitch
                      data-telemetry-id={`entSearchContent-${ingestionMethod}-overview-generateApiKey-optimizedRequest`}
                      onChange={(event) => setOptimizedRequest(event.target.checked)}
                      label={i18n.translate(
                        'xpack.enterpriseSearch.content.overview.optimizedRequest.label',
                        { defaultMessage: 'View Enterprise Search optimized request' }
                      )}
                      checked={optimizedRequest}
                    />
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
              {indexName[0] !== '.' && (
                <>
                  <EuiSpacer />
                  <EuiFlexItem>
                    <CurlRequest
                      apiKey={apiKey}
                      document={DOCUMENTS_API_JSON_EXAMPLE}
                      indexName={indexName}
                      pipeline={optimizedRequest ? defaultPipeline : undefined}
                    />
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
