/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../shared/doc_links';
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
  const { indexName, ingestionMethod, isHiddenIndex } = useValues(IndexViewLogic);
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
            {isHiddenIndex ? (
              <EuiEmptyPrompt
                body={
                  <p>
                    {i18n.translate('xpack.enterpriseSearch.content.overview.emptyPrompt.body', {
                      defaultMessage:
                        'We do not recommend adding documents to an externally managed index.',
                    })}
                  </p>
                }
                title={
                  <h2>
                    {i18n.translate('xpack.enterpriseSearch.content.overview.emptyPrompt.title', {
                      defaultMessage: 'Index managed externally',
                    })}
                  </h2>
                }
              />
            ) : (
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart">
                    <EuiFlexItem>
                      <EuiFlexGroup direction="column">
                        <EuiFlexItem>
                          <EuiTitle size="s">
                            <h2>
                              {i18n.translate(
                                'xpack.enterpriseSearch.content.overview.documentExample.title',
                                { defaultMessage: 'Adding documents to your index' }
                              )}
                            </h2>
                          </EuiTitle>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText size="s">
                            <p>
                              <FormattedMessage
                                id="xpack.enterpriseSearch.content.overview.documentExample.description.text"
                                defaultMessage="Generate an API key and read the {documentation} on how to send documents to the Elasticsearch API endpoint. Use Elastic  {clients} for streamlined integration."
                                values={{
                                  clients: (
                                    <EuiLink href={docLinks.clientsGuide} external>
                                      {i18n.translate(
                                        'xpack.enterpriseSearch.content.overview.documentExample.description.clientsLink',
                                        { defaultMessage: 'programming language clients' }
                                      )}
                                    </EuiLink>
                                  ),
                                  documentation: (
                                    <EuiLink href={docLinks.indexApi} external>
                                      {i18n.translate(
                                        'xpack.enterpriseSearch.content.overview.documentExample.description.documentationLink',
                                        { defaultMessage: 'documentation' }
                                      )}
                                    </EuiLink>
                                  ),
                                }}
                              />
                            </p>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
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

                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    data-telemetry-id={`entSearchContent-${ingestionMethod}-overview-generateApiKey-optimizedRequest`}
                    onChange={(event) => setOptimizedRequest(event.target.checked)}
                    label={i18n.translate(
                      'xpack.enterpriseSearch.content.overview.optimizedRequest.label',
                      { defaultMessage: 'View Search optimized request' }
                    )}
                    checked={optimizedRequest}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <CurlRequest
                    apiKey={apiKey}
                    document={DOCUMENTS_API_JSON_EXAMPLE}
                    indexName={indexName}
                    pipeline={optimizedRequest ? defaultPipeline : undefined}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
