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
  EuiToolTip,
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
import { useConnectorTypes } from '../../hooks/api/use_connector_types';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

import { BACK_LABEL } from '../../../../common/i18n_string';

export const ElasticManagedConnectorComingSoon: React.FC = () => {
  const connectorTypes = useConnectorTypes();

  const getConnectorByName = (connectors: typeof connectorTypes, serviceType: string) => {
    return connectors.find((connector) => connector.serviceType === serviceType);
  };

  const connectorIcon = (connector: { name: string; serviceType: string; iconPath?: string }) => {
    return (
      <EuiToolTip content={connector.name}>
        <EuiIcon
          size="l"
          title={connector?.name}
          id={connector?.serviceType}
          type={connector?.iconPath || 'defaultIcon'}
        />
      </EuiToolTip>
    );
  };

  const connectorExample1 = getConnectorByName(connectorTypes, 'gmail');
  const connectorExample2 = getConnectorByName(connectorTypes, 'sharepoint_online');
  const connectorExample3 = getConnectorByName(connectorTypes, 'jira');
  const connectorExample4 = getConnectorByName(connectorTypes, 'dropbox');

  const {
    application: { navigateToUrl },
  } = useKibanaServices();

  const assetBasePath = useAssetBasePath();
  const connectorsIcon = assetBasePath + '/connectors.svg';
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
                data-test-subj="serverlessSearchElasticManagedConnectorEmptyBackButton"
                iconType="arrowLeft"
                onClick={() => navigateToUrl(`./`)}
              >
                {BACK_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiIcon size="xxl" type={connectorsIcon} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle>
                <h2>
                  {i18n.translate('xpack.serverlessSearch.elasticManagedConnectorEmpty.title', {
                    defaultMessage: 'Elastic managed connectors',
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
                    'xpack.serverlessSearch.elasticManagedConnectorEmpty.description',
                    {
                      defaultMessage:
                        "We're actively developing Elastic managed connectors, that won't require any self-managed infrastructure. You'll be able to handle all configuration in the UI. This will simplify syncing your data into a serverless Elasticsearch project. This new workflow will have two steps:",
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
                      // @ts-ignore
                      inert=""
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
                              {connectorExample1 && connectorIcon(connectorExample1)}
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              {connectorExample2 && connectorIcon(connectorExample2)}
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiIcon color="primary" size="l" type="documents" />
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              {connectorExample3 && connectorIcon(connectorExample3)}
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              {connectorExample4 && connectorIcon(connectorExample4)}
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText>
                            <p>
                              {i18n.translate(
                                'xpack.serverlessSearch.elasticManagedConnectorEmpty.guideOneDescription',
                                {
                                  defaultMessage:
                                    "Choose from over 30 third-party data sources you'd like to sync",
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
                              <EuiIcon color="primary" size="l" type={connectorsIcon} />
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
                                'xpack.serverlessSearch.elasticManagedConnectorEmpty.guideThreeDescription',
                                {
                                  defaultMessage:
                                    'Enter access and connection details for your data source and run your first sync using the Kibana UI',
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
                    'xpack.serverlessSearch.elasticManagedConnectorEmpty.subDescription',
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
                  'xpack.serverlessSearch.elasticManagedConnectorEmpty.additionalFeedback.Label',
                  {
                    defaultMessage:
                      'Would you like to share any ideas or suggestions about Elastic managed connectors?',
                  }
                )}
              >
                <EuiFlexGroup direction="column" gutterSize="s">
                  <EuiFlexItem>
                    <EuiTextArea
                      data-test-subj="serverlessSearchElasticManagedConnectorCommingSoonTextArea"
                      onChange={(e) => {
                        // setAdditionalFeedback(e.target.value);
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText color="subdued" size="xs">
                      <FormattedMessage
                        id="xpack.serverlessSearch.elasticManagedConnectorEmpty.additionalFeedback.description"
                        defaultMessage=" By submitting feedback you acknowledge that you've read and agree to our {termsOfService}, and that Elastic may {contact} about our related products and services,
                      using the details you provide above. See {privacyStatementLink} for more
                      details or to opt-out at any time."
                        values={{
                          contact: (
                            <EuiLink
                              data-test-subj="serverlessSearchElasticManagedConnectorCommingSoonContactYouLink"
                              href={'docLinks.workplaceSearchGatedFormDataUse'}
                            >
                              <FormattedMessage
                                id="xpack.serverlessSearch.elasticManagedConnectorEmpty.additionalFeedback.contact"
                                defaultMessage="contact you"
                              />
                            </EuiLink>
                          ),
                          privacyStatementLink: (
                            <EuiLink
                              data-test-subj="serverlessSearchElasticManagedConnectorCommingSoonElasticsPrivacyStatementLink"
                              href={'docLinks.workplaceSearchGatedFormPrivacyStatement'}
                            >
                              <FormattedMessage
                                id="xpack.serverlessSearch.elasticManagedConnectorEmpty.additionalFeedback.readDataPrivacyStatementLink"
                                defaultMessage="Elastic’s Privacy Statement"
                              />
                            </EuiLink>
                          ),
                          termsOfService: (
                            <EuiLink
                              data-test-subj="serverlessSearchElasticManagedConnectorCommingSoonTermsOfServiceLink"
                              href={'docLinks.workplaceSearchGatedFormTermsOfService'}
                            >
                              <FormattedMessage
                                id="xpack.serverlessSearch.elasticManagedConnectorEmpty.additionalFeedback.readTermsOfService"
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
                  data-test-subj="serverlessSearchElasticManagedConnectorEmptysubmitFormButton"
                  fill
                  type="submit"
                  // onClick={() => {}}
                >
                  {i18n.translate(
                    'xpack.serverlessSearch.elasticManagedConnectorEmpty.submitFormButton',
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
