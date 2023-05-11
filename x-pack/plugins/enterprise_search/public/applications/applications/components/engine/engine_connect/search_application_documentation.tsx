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
  EuiIcon,
  EuiImage,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import welcomeGraphicLight from '../../../../../assets/images/welcome_light.svg';

export const SearchApplicationDocumentation = () => {
  return (
    <EuiPanel color="transparent">
      <EuiFlexGroup justifyContent="spaceBetween" direction="row">
        <EuiFlexGroup direction="column">
          <EuiImage size="l" float="left" src={welcomeGraphicLight} alt="" />

          <EuiText>
            <h2>
              {i18n.translate(
                'xpack.enterpriseSearch.content.searchApplication.documentation.text.title',
                {
                  defaultMessage: 'Learn more about Search Applications',
                }
              )}
            </h2>
          </EuiText>

          <EuiText>
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.searchApplication.documentation.text.paragraph',
                {
                  defaultMessage:
                    'Search Applications help make your Elasticsearch data searchable for end users, with out-of-the-box relevance, analytics and personalization tools.',
                }
              )}
            </p>
          </EuiText>

          <EuiLink href="#" external>
            {i18n.translate(
              'xpack.enterpriseSearch.content.searchApplication.documentation.readMoreLink',
              {
                defaultMessage: 'Read our documentation',
              }
            )}
          </EuiLink>
        </EuiFlexGroup>
        <EuiFlexGroup justifyContent="spaceBetween" direction="column">
          <EuiFlexItem grow>
            <EuiPanel grow paddingSize="l">
              <EuiFlexGroup direction="row">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="lock" size="l" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <EuiText>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.searchApplication.documentation.manageAPIKeys.title',
                        { defaultMessage: 'Manage API Keys' }
                      )}
                    </EuiText>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer />
              <EuiFlexGroup direction="column" justifyContent="spaceBetween" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.searchApplication.documentation.manageAPIKeys.description',
                        {
                          defaultMessage:
                            'API keys provide a secure way to control access to Elasticsearch data and functionalities, and to limit access to specific indices or actions.',
                        }
                      )}
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <EuiLink href="#" external>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.searchApplication.documentation.manageAPIKeys.learnMore',
                        {
                          defaultMessage: 'Learn more',
                        }
                      )}
                    </EuiLink>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiPanel grow paddingSize="l">
              <EuiFlexGroup direction="row">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="keyboard" size="l" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <EuiText>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.searchApplication.documentation.languageClients.title',
                        { defaultMessage: 'Build with language clients' }
                      )}
                    </EuiText>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer />
              <EuiFlexGroup direction="column" justifyContent="spaceBetween" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.searchApplication.documentation.languageClients.description',
                        {
                          defaultMessage:
                            'Develop for Elasticsearch in your preferred programming languages through our first and third-party supported clients.',
                        }
                      )}
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <EuiLink href="#" external>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.searchApplication.documentation.languageClients.learnMore',
                        {
                          defaultMessage: 'Learn more',
                        }
                      )}
                    </EuiLink>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiPanel grow paddingSize="l">
              <EuiFlexGroup direction="row">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="securitySignal" size="l" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <EuiText>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.searchApplication.documentation.monitorPerformance.title',
                        { defaultMessage: 'Monitor performance' }
                      )}
                    </EuiText>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer />
              <EuiFlexGroup direction="column" justifyContent="spaceBetween" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.searchApplication.documentation.monitorPerformance.description',
                        {
                          defaultMessage:
                            'Gain insights into the performance of your search application easily with Behavioral Analytics.',
                        }
                      )}
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <EuiLink href="#" external>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.searchApplication.documentation.monitorPerformance.learnMore',
                        {
                          defaultMessage: 'Learn more',
                        }
                      )}
                    </EuiLink>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
