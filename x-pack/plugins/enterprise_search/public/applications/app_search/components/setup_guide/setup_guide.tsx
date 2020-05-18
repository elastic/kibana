/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageSideBar,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiImage,
  EuiIcon,
  EuiSteps,
  EuiCode,
  EuiCodeBlock,
  EuiAccordion,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { SetAppSearchBreadcrumbs as SetBreadcrumbs } from '../../../shared/kibana_breadcrumbs';
import { SendAppSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

import GettingStarted from '../../assets/getting_started.png';
import './setup_guide.scss';

export const SetupGuide: React.FC<> = () => {
  return (
    <EuiPage className="setup-guide">
      <SetBreadcrumbs text="Setup Guide" />
      <SendTelemetry action="viewed" metric="setup_guide" />

      <EuiPageSideBar>
        <EuiText color="subdued" size="s">
          <strong>
            <FormattedMessage
              id="xpack.enterpriseSearch.setupGuide.title"
              defaultMessage="Setup Guide"
            />
          </strong>
        </EuiText>
        <EuiSpacer size="s" />

        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoAppSearch" size="l" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h1>
                <FormattedMessage
                  id="xpack.enterpriseSearch.productTitle"
                  defaultMessage="App Search"
                />
              </h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <a
          href="https://www.elastic.co/webinars/getting-started-with-elastic-app-search"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            className="setup-guide__thumbnail"
            src={GettingStarted}
            alt={i18n.translate('xpack.enterpriseSearch.setupGuide.videoAlt', {
              defaultMessage:
                "Getting started with App Search - in this short video we'll guide you through how to get App Search up and running",
            })}
            width="1280"
            height-="720"
          />
        </a>

        <EuiTitle size="s">
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.setupGuide.description"
              defaultMessage="Elastic App Search provides user-friendly tools to design and deploy a powerful search to your websites or web/mobile applications."
            />
          </p>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.setupGuide.notConfigured"
              defaultMessage="App Search has not been configured in your Kibana instance yet. To get started, follow the instructions on this page."
            />
          </p>
        </EuiText>
      </EuiPageSideBar>

      <EuiPageBody>
        <EuiPageContent>
          <EuiSteps
            headingElement="h2"
            steps={[
              {
                title: i18n.translate('xpack.enterpriseSearch.setupGuide.step1.title', {
                  defaultMessage: 'Add your App Search host URL to your Kibana configuration',
                }),
                children: (
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.setupGuide.step1.instruction1"
                        defaultMessage="Within your {configFile} file, set {configSetting} to the URL of your App Search instance. For example:"
                        values={{
                          configFile: <EuiCode>config/kibana.yml</EuiCode>,
                          configSetting: <EuiCode>enterpriseSearch.host</EuiCode>,
                        }}
                      />
                    </p>
                    <EuiCodeBlock language="yml">
                      enterpriseSearch.host: &apos;http://localhost:3002&apos;
                    </EuiCodeBlock>
                  </EuiText>
                ),
              },
              {
                title: i18n.translate('xpack.enterpriseSearch.setupGuide.step2.title', {
                  defaultMessage: 'Reload your Kibana instance',
                }),
                children: (
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.setupGuide.step2.instruction1"
                        defaultMessage="Restart Kibana to pick up the configuration changes from the previous step."
                      />
                    </p>
                    <p>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.setupGuide.step2.instruction2"
                        defaultMessage="If you’re using {elasticsearchNativeAuthLink} within App Search - you’re all set! All users should be able to use App Search in Kibana automatically, inheriting the existing access and permissions they have within App Search."
                        values={{
                          elasticsearchNativeAuthLink: (
                            <EuiLink
                              href="https://swiftype.com/documentation/app-search/self-managed/security#elasticsearch-native-realm"
                              target="_blank"
                            >
                              Elasticsearch Native Auth
                            </EuiLink>
                          ),
                        }}
                      />
                    </p>
                  </EuiText>
                ),
              },
              {
                title: i18n.translate('xpack.enterpriseSearch.setupGuide.step3.title', {
                  defaultMessage: 'Troubleshooting issues',
                }),
                children: (
                  <>
                    <EuiAccordion
                      buttonContent={i18n.translate(
                        'xpack.enterpriseSearch.troubleshooting.differentEsClusters.title',
                        {
                          defaultMessage:
                            'App Search and Kibana are on different Elasticsearch clusters',
                        }
                      )}
                      id="differentEsClusters"
                      paddingSize="s"
                    >
                      <EuiText>
                        <p>
                          <FormattedMessage
                            id="xpack.enterpriseSearch.troubleshooting.differentEsClusters.description"
                            defaultMessage="This plugin does not currently support App Search and Kibana running on different clusters."
                          />
                        </p>
                      </EuiText>
                    </EuiAccordion>
                    <EuiSpacer />
                    <EuiAccordion
                      buttonContent={i18n.translate(
                        'xpack.enterpriseSearch.troubleshooting.differentAuth.title',
                        {
                          defaultMessage:
                            'App Search and Kibana are on different authentication methods',
                        }
                      )}
                      id="differentAuth"
                      paddingSize="s"
                    >
                      <EuiText>
                        <p>
                          <FormattedMessage
                            id="xpack.enterpriseSearch.troubleshooting.differentAuth.description"
                            defaultMessage="This plugin does not currently support App Search and Kibana operating on different authentication methods (for example, App Search using a different SAML provider than Kibana)."
                          />
                        </p>
                      </EuiText>
                    </EuiAccordion>
                    <EuiSpacer />
                    <EuiAccordion
                      buttonContent={i18n.translate(
                        'xpack.enterpriseSearch.troubleshooting.standardAuth.title',
                        {
                          defaultMessage: 'App Search on Standard authentication',
                        }
                      )}
                      id="standardAuth"
                      paddingSize="s"
                    >
                      <EuiText>
                        <p>
                          <FormattedMessage
                            id="xpack.enterpriseSearch.troubleshooting.standardAuth.description"
                            defaultMessage='App Search operating on {standardAuthLink} is currently not fully supported by this plugin. Users created in App Search must be granted Kibana access. Users created in Kibana will see "Cannot find App Search account" error messages.'
                            values={{
                              standardAuthLink: (
                                <EuiLink
                                  href="https://swiftype.com/documentation/app-search/self-managed/security#standard"
                                  target="_blank"
                                >
                                  Standard Auth
                                </EuiLink>
                              ),
                            }}
                          />
                        </p>
                      </EuiText>
                    </EuiAccordion>
                  </>
                ),
              },
            ]}
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
