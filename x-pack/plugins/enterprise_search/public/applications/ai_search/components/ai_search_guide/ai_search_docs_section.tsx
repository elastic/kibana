/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../shared/doc_links';

export const SetAISearchChromeSearchDocsSection: React.FC = () => (
  <EuiFlexGroup alignItems="center">
    <EuiFlexItem grow={4}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.enterpriseSearch.aiSearch.aiSearchDocsSection.title"
                defaultMessage="Dive deeper with AI Search"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.aiSearch.aiSearchDocsSection.description"
                defaultMessage="To learn more about how to get started and test these tools with concrete examples, visit {searchLab}."
                values={{
                  searchLab: (
                    <EuiLink
                      data-telemetry-id="entSearch-aiSearch-documentation-searchLabsLink"
                      target="_blank"
                      href={docLinks.searchLabs}
                      external
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.aiSearch.aiSearchDocsSection.description.searchLabsLinkText',
                        {
                          defaultMessage: 'Search Labs',
                        }
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
    <EuiFlexItem grow={6}>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.aiSearch.aiSearchDocsSection.learn.title"
                      defaultMessage="Learn"
                    />
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.aiSearch.aiSearchDocsSection.learn.description"
                      defaultMessage="The {searchLabsRepo} has notebooks, sample apps, and resources."
                      values={{
                        searchLabsRepo: (
                          <EuiLink
                            data-telemetry-id="entSearch-aiSearch-documentation-searchLabsRepoLink"
                            target="_blank"
                            href={docLinks.searchLabsRepo}
                            external
                          >
                            {i18n.translate(
                              'xpack.enterpriseSearch.aiSearch.aiSearchDocsSection.learn.searchLabsRepoLinkText',
                              {
                                defaultMessage: 'Search Labs Github repo',
                              }
                            )}
                          </EuiLink>
                        ),
                      }}
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.aiSearch.aiSearchDocsSection.doc.title"
                      defaultMessage="Docs"
                    />
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.aiSearch.aiSearchDocsSection.doc.description"
                      defaultMessage="Visit the {aiSearchDoc}."
                      values={{
                        aiSearchDoc: (
                          <EuiLink
                            data-telemetry-id="entSearch-aiSearch-documentation-aiSearchDocLink"
                            target="_blank"
                            href={docLinks.aiSearchDoc}
                            external
                          >
                            {i18n.translate(
                              'xpack.enterpriseSearch.aiSearch.aiSearchDocsSection.doc.aiSearchDocLinkText',
                              {
                                defaultMessage: 'Elastic documentation',
                              }
                            )}
                          </EuiLink>
                        ),
                      }}
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.aiSearch.aiSearchDocsSection.help.title"
                      defaultMessage="Help"
                    />
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.aiSearch.aiSearchDocsSection.help.description"
                      defaultMessage="Need help? Check out the {discussForum}!"
                      values={{
                        discussForum: (
                          <EuiLink
                            data-telemetry-id="entSearch-aiSearch-documentation-aiSearchHelpLink"
                            target="_blank"
                            href={docLinks.aiSearchHelp}
                            external={false}
                          >
                            {i18n.translate(
                              'xpack.enterpriseSearch.aiSearch.aiSearchDocsSection.help.helpLinkText',
                              {
                                defaultMessage: 'discuss forum or Elastic community Slack',
                              }
                            )}
                          </EuiLink>
                        ),
                      }}
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);
