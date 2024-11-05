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
  EuiIcon,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiBadge,
  EuiStepsHorizontal,
  EuiStepsHorizontalProps,
  EuiButtonEmpty,
  EuiFormRow,
  EuiTextArea,
  EuiLink,
  EuiForm,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useKibanaServices } from '../../hooks/use_kibana';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

import { BACK_LABEL } from '../../../../common/i18n_string';

export const ElasticManagedWebCrawlersCommingSoon: React.FC = () => {
  const {
    application: { navigateToUrl },
  } = useKibanaServices();

  const assetBasePath = useAssetBasePath();
  const webCrawlerIcon = assetBasePath + '/web_crawlers.svg';
  const horizontalSteps: EuiStepsHorizontalProps['steps'] = [
    {
      title: '',
      status: 'incomplete',
      onClick: () => {},
    },
    {
      title: '',
      status: 'incomplete',
      onClick: () => {},
    },
  ];
  return (
    <EuiFlexGroup alignItems="center" direction="column">
      <EuiFlexItem>
        <EuiPanel paddingSize="l" hasShadow={false} hasBorder>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="center"
            direction="column"
            gutterSize="l"
          >
            <EuiFlexItem>
              <EuiButtonEmpty
                data-test-subj="serverlessSearchElasticManagedWebCrawlerEmptyBackButton"
                iconType="arrowLeft"
                onClick={() => navigateToUrl(`./`)}
              >
                {BACK_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiIcon size="xxl" type={webCrawlerIcon} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle>
                <h2>
                  {i18n.translate('xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.title', {
                    defaultMessage: 'Elastic managed web crawlers',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiBadge color="accent">Coming soon</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText textAlign="center" color="subdued">
                <p>
                  {i18n.translate(
                    'xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.description',
                    {
                      defaultMessage:
                        "We're actively developing Elastic managed web crawlers, that won't require any self-managed infrastructure. You'll be able to handle all configuration in the UI. This will simplify syncing your data into a serverless Elasticsearch project. This new workflow will have two steps:",
                    }
                  )}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexGroup
              alignItems="stretch"
              justifyContent="center"
              direction="column"
              gutterSize="s"
            >
              <EuiFlexItem>
                <EuiPanel color="subdued">
                  <EuiFlexItem grow={false}>
                    <EuiStepsHorizontal
                      css={css`
                        pointer-events: none;
                      `}
                      steps={horizontalSteps}
                      size="s"
                    />
                  </EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiFlexGroup
                        justifyContent="flexStart"
                        alignItems="center"
                        direction="column"
                      >
                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup
                            justifyContent="center"
                            alignItems="center"
                            direction="row"
                            gutterSize="s"
                          >
                            <EuiFlexItem grow={false}>
                              <EuiIcon color="primary" size="l" type="globe" />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText>
                            <p>
                              {i18n.translate(
                                'xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.guideOneDescription',
                                {
                                  defaultMessage: 'Set one or more domain URLs you want to crawl',
                                }
                              )}
                            </p>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFlexGroup
                        justifyContent="flexStart"
                        alignItems="center"
                        direction="column"
                      >
                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup
                            gutterSize="s"
                            direction="row"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <EuiFlexItem>
                              <EuiIcon color="primary" size="l" type={webCrawlerIcon} />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiIcon color="primary" size="l" type="logoElastic" />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText>
                            <p>
                              {i18n.translate(
                                'xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.guideThreeDescription',
                                {
                                  defaultMessage:
                                    'Configure all the web crawler process using Kibana',
                                }
                              )}
                            </p>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexItem>
              <EuiText textAlign="center" color="subdued">
                <p>
                  {i18n.translate(
                    'xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.subDescription',
                    {
                      defaultMessage:
                        'We value your feedback! Please share your ideas and suggestions as we develop this new feature.',
                    }
                  )}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiForm component="form" fullWidth>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.additionalFeedback.Label',
                  {
                    defaultMessage:
                      'Would you like to share any ideas or suggestions about Elastic managed web crawlers?',
                  }
                )}
              >
                <EuiFlexGroup direction="column" gutterSize="s">
                  <EuiFlexItem>
                    <EuiTextArea
                      data-test-subj="serverlessSearchElasticManagedWebCrawlerCommingSoonTextArea"
                      onChange={(e) => {
                        // setAdditionalFeedback(e.target.value);
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText color="subdued" size="xs">
                      <FormattedMessage
                        id="xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.additionalFeedback.description"
                        defaultMessage=" By submitting feedback you acknowledge that you've read and agree to our {termsOfService}, and that Elastic may {contact} about our related products and services,
                      using the details you provide above. See {privacyStatementLink} for more
                      details or to opt-out at any time."
                        values={{
                          contact: (
                            <EuiLink
                              data-test-subj="serverlessSearchElasticManagedWebCrawlerCommingSoonContactYouLink"
                              href={'docLinks.workplaceSearchGatedFormDataUse'}
                            >
                              <FormattedMessage
                                id="xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.additionalFeedback.contact"
                                defaultMessage="contact you"
                              />
                            </EuiLink>
                          ),
                          privacyStatementLink: (
                            <EuiLink
                              data-test-subj="serverlessSearchElasticManagedWebCrawlerCommingSoonElasticsPrivacyStatementLink"
                              href={'docLinks.workplaceSearchGatedFormPrivacyStatement'}
                            >
                              <FormattedMessage
                                id="xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.additionalFeedback.readDataPrivacyStatementLink"
                                defaultMessage="Elastic’s Privacy Statement"
                              />
                            </EuiLink>
                          ),
                          termsOfService: (
                            <EuiLink
                              data-test-subj="serverlessSearchElasticManagedWebCrawlerCommingSoonTermsOfServiceLink"
                              href={'docLinks.workplaceSearchGatedFormTermsOfService'}
                            >
                              <FormattedMessage
                                id="xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.additionalFeedback.readTermsOfService"
                                defaultMessage="Terms of Service"
                              />
                            </EuiLink>
                          ),
                        }}
                      />
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
            </EuiForm>
            <EuiFlexGroup direction="row" gutterSize="m">
              <EuiFlexItem>
                <EuiButton
                  data-test-subj="serverlessSearchElasticManagedWebCrawlerEmptysubmitFormButton"
                  fill
                  type="submit"
                  // onClick={() => ()}
                >
                  {i18n.translate(
                    'xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.submitFormButton',
                    {
                      defaultMessage: 'Submit',
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            {/* <EuiSpacer size="m" /> */}
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
