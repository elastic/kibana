/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../../shared/doc_links';

import { EuiButtonTo } from '../../../../../shared/react_router_helpers';
import { AppLogic } from '../../../../app_logic';
import connectionIllustration from '../../../../assets/connection_illustration.svg';
import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../components/layout';
import { NAV } from '../../../../constants';
import { getSourcesPath, getAddPath } from '../../../../routes';
import { staticGenericExternalSourceData } from '../../source_data';

import { AddSourceHeader } from './add_source_header';

import './add_source.scss';

export const AddSourceBYOIntro: React.FC = () => {
  const { name, categories = [], serviceType } = staticGenericExternalSourceData;
  const { isOrganization } = useValues(AppLogic);

  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;
  const to = `${getSourcesPath(getAddPath(serviceType), isOrganization)}/connector_registration`;
  return (
    <Layout pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE, name]}>
      <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />
      <EuiSpacer />
      <EuiFlexGroup
        justifyContent="flexStart"
        alignItems="flexStart"
        direction="row"
        responsive={false}
      >
        <EuiFlexItem>
          <EuiPanel color="subdued" paddingSize="none">
            <EuiFlexGroup
              justifyContent="flexStart"
              alignItems="stretch"
              direction="row"
              gutterSize="xl"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <div className="adding-a-source__intro-image">
                  <img
                    src={connectionIllustration}
                    alt={i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.contentSource.byoConfigIntro.alt.text',
                      {
                        defaultMessage: 'Connection illustration',
                      }
                    )}
                  />
                </div>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup direction="column" className="adding-a-source__intro-steps">
                  <EuiFlexItem>
                    <EuiSpacer size="xl" />
                    <EuiTitle size="l">
                      <h2>
                        {i18n.translate(
                          'xpack.enterpriseSearch.workplaceSearch.contentSource.byoConfigIntro.steps.title',
                          {
                            defaultMessage:
                              'Build and deploy a custom connector package to add data from custom content sources, or modify the behavior of first party content sources',
                          }
                        )}
                      </h2>
                    </EuiTitle>
                    <EuiSpacer size="l" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup
                      alignItems="flexStart"
                      justifyContent="flexStart"
                      responsive={false}
                    >
                      <EuiFlexItem grow={false}>
                        <div className="adding-a-source__intro-step">
                          <EuiTitle size="xs">
                            <h3>
                              {i18n.translate(
                                'xpack.enterpriseSearch.workplaceSearch.contentSource.byoConfigIntro.step1.heading',
                                {
                                  defaultMessage: 'Step 1',
                                }
                              )}
                            </h3>
                          </EuiTitle>
                        </div>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="m" grow={false}>
                          <h4>
                            <FormattedMessage
                              id="xpack.enterpriseSearch.workplaceSearch.contentSource.byoConfigIntro.step1.title"
                              defaultMessage="Build or modify the code"
                            />
                          </h4>
                          <p>
                            <FormattedMessage
                              id="xpack.enterpriseSearch.workplaceSearch.contentSource.byoConfigIntro.step1.text"
                              defaultMessage="In the Connector Package {repositoryLink}, there’s everything you need to understand the connector framework and get set up with your coding environment."
                              values={{
                                repositoryLink: (
                                  <EuiLink
                                    external
                                    target="_blank"
                                    href="https://github.com/elastic/connectors"
                                  >
                                    {i18n.translate(
                                      'xpack.enterpriseSearch.workplaceSearch.contentSource.byoConfigIntro.step1.repositoryLinkLabel',
                                      { defaultMessage: 'repository' }
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
                  <EuiFlexItem>
                    <EuiFlexGroup
                      alignItems="flexStart"
                      justifyContent="flexStart"
                      responsive={false}
                    >
                      <EuiFlexItem grow={false}>
                        <div className="adding-a-source__intro-step">
                          <EuiTitle size="xs">
                            <h4>
                              {i18n.translate(
                                'xpack.enterpriseSearch.workplaceSearch.contentSource.byoConfigIntro.step2.heading',
                                {
                                  defaultMessage: 'Step 2',
                                }
                              )}
                            </h4>
                          </EuiTitle>
                        </div>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="m" grow={false}>
                          <h4>
                            <FormattedMessage
                              id="xpack.enterpriseSearch.workplaceSearch.contentSource.byoConfigIntro.step2.title"
                              defaultMessage="Deploy your custom connector package"
                            />
                          </h4>
                          <p>
                            <FormattedMessage
                              id="xpack.enterpriseSearch.workplaceSearch.contentSource.byoConfigIntro.step2.text"
                              defaultMessage="Connector packages are self managed on the infrastructure you deploy. Review the {documentationLink} for prerequisites to get started with your deployment."
                              values={{
                                documentationLink: (
                                  <EuiLink
                                    external
                                    target="_blank"
                                    href={docLinks.workplaceSearchCustomConnectorPackage}
                                  >
                                    {i18n.translate(
                                      'xpack.enterpriseSearch.workplaceSearch.contentSource.byoConfigIntro.step2.documentationLinkLabel',
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
                  <EuiFlexItem>
                    <EuiText size="m" grow={false}>
                      <p>
                        <FormattedMessage
                          id="xpack.enterpriseSearch.workplaceSearch.contentSource.byoConfigIntro.step3.text"
                          defaultMessage="Once you’ve built and deployed your connector package, come back here to register your connector package deployment, finalize configuration and connect to your content sources."
                        />
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiSpacer size="l" />
                    <EuiFormRow>
                      <EuiButtonTo
                        color="primary"
                        data-test-subj="ConfigureStepButton"
                        fill
                        to={to}
                      >
                        {i18n.translate(
                          'xpack.enterpriseSearch.workplaceSearch.contentSource.byoConfigIntro.configure.button',
                          {
                            defaultMessage: 'Register your deployment',
                          }
                        )}
                      </EuiButtonTo>
                    </EuiFormRow>
                    <EuiSpacer size="xl" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Layout>
  );
};
