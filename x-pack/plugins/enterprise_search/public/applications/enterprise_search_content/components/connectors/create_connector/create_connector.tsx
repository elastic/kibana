/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { css } from '@emotion/react';

import { useValues, useActions } from 'kea';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiSuperSelect,
  EuiText,
  useEuiTheme,
  EuiStepStatus,
} from '@elastic/eui';

import { EuiStepInterface } from '@elastic/eui/src/components/steps/step';
import { i18n } from '@kbn/i18n';
import { ConnectorStatus } from '@kbn/search-connectors';
import { ConnectorDefinition } from '@kbn/search-connectors-plugin/public';

import * as Constants from '../../../../shared/constants';
import { KibanaLogic } from '../../../../shared/kibana';
import { AddConnectorApiLogic } from '../../../api/connector/add_connector_api_logic';
import { ConnectorViewLogic } from '../../connector_detail/connector_view_logic';
import { EnterpriseSearchContentPageTemplate } from '../../layout';
import { errorToText } from '../../new_index/utils/error_to_text';
import { connectorsBreadcrumbs } from '../connectors';

import connectorsBackgroundImage from './assets/connector_logos_comp.png';

import { ConfigurationStep } from './configuration_step';
import { CreateConnectorLogic } from './create_connector_logic';
import { DeploymentStep } from './deployment_step';
import { FinishUpStep } from './finish_up_step';
import { StartStep } from './start_step';

export const CreateConnector: React.FC = () => {
  const { apiReset, createConnector } = useActions(CreateConnectorLogic);
  const { error, status } = useValues(AddConnectorApiLogic);
  const { euiTheme } = useEuiTheme();
  const [selfManaged, setSelfManaged] = useState(false);
  const { connectorTypes } = useValues(KibanaLogic);
  const allConnectors = connectorTypes.sort((a, b) => a.name.localeCompare(b.name)); // alphabetically ordered
  const { fetchConnector } = useActions(ConnectorViewLogic);
  const [syncing, setSyncing] = useState(false);
  const { connector } = useValues(ConnectorViewLogic);

  let isNative = true; // isNativeAvailable && isNativeProp
  let serviceType = ''; // TODO: Review

  if (connector) {
    connector.status = 'created' as ConnectorStatus;
    connector.api_key_id = '123';
  }
  useEffect(() => {
    fetchConnector({ connectorId: 'eIwou5AB7hZjs4c7Qmm4' });
  }, []);
  const [startStepStatus, setStartStepStatus] = useState<EuiStepStatus>('current');
  const [deploymentStepStatus, setDeploymentStepStatus] = useState<EuiStepStatus>('incomplete');
  const [configurationStepStatus, setConfigurationStepStatus] =
    useState<EuiStepStatus>('incomplete');
  const [finishUpStepStatus, setFinishUpStepStatus] = useState<EuiStepStatus>('incomplete');
  const [currentStep, setCurrentStep] = useState(0);
  const [connectorSelected, setConnectorSelected] = useState<ConnectorDefinition>({
    docsUrl: '',
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    iconPath: '',
    isBeta: true,
    isNative: true,
    keywords: [],
    name: '',
    serviceType: '',
  });
  const [connectorName, setConnectorName] = useState('');
  const [deploymentStepComplete, setDeploymentStepComplete] = useState(false);
  const [configurationStepComplete, setConfigurationStepComplete] = useState(false);
  const [finishUpStepComplete, setFinishUpStepComplete] = useState(false);

  interface CustomEuiStepInterface extends EuiStepInterface {
    content: JSX.Element;
  }
  const selfManagedSteps: CustomEuiStepInterface[] = [
    {
      children: <EuiSpacer size="xs" />,
      content: (
        <StartStep
          title={i18n.translate('xpack.enterpriseSearch.createConnector.startStep.startLabel', {
            defaultMessage: 'Start',
          })}
          allConnectors={allConnectors}
          connectorName={connectorName}
          connectorSelected={connectorSelected}
          currentStep={currentStep}
          isNextStepEnabled={deploymentStepComplete}
          selfManaged={selfManaged}
          setConnectorName={setConnectorName}
          setConnectorSelected={setConnectorSelected}
          setCurrentStep={setCurrentStep}
          setNextStepEnabled={setDeploymentStepComplete}
          setSelfManaged={setSelfManaged}
          // TODO:
          connector={connector}
          error={errorToText(error)}
          onNameChange={() => {
            apiReset();
          }}
          onSubmit={(name) =>
            createConnector({
              isNative,
              language: null,
              name,
              serviceType,
            })
          }
        />
      ),
      status: startStepStatus,
      title: i18n.translate('xpack.enterpriseSearch.createConnector.startStep.startLabel', {
        defaultMessage: 'Start',
      }),
    },
    {
      children: '',
      content: (
        <DeploymentStep
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          isNextStepEnabled={configurationStepComplete}
          setNextStepEnabled={setConfigurationStepComplete}
        />
      ),

      status: deploymentStepStatus,
      title: i18n.translate(
        'xpack.enterpriseSearch.createConnector.deploymentStep.deploymentLabel',
        { defaultMessage: 'Deployment' }
      ),
    },
    {
      children: '',
      content: (
        <ConfigurationStep
          title={i18n.translate(
            'xpack.enterpriseSearch.createConnector.configurationStep.configurationLabel',
            { defaultMessage: 'Configuration' }
          )}
          connector={connector}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          isNextStepEnabled={finishUpStepComplete}
          setNextStepEnabled={setFinishUpStepComplete}
          syncing={syncing}
          setSyncing={setSyncing}
        />
      ),
      status: configurationStepStatus,
      title: i18n.translate(
        'xpack.enterpriseSearch.createConnector.configurationStep.configurationLabel',
        { defaultMessage: 'Configuration' }
      ),
    },
    {
      children: '',

      content: (
        <FinishUpStep
          title={i18n.translate(
            'xpack.enterpriseSearch.createConnector.finishUpStep.finishUpLabel',
            { defaultMessage: 'Finish up' }
          )}
          syncing={syncing}
          setSyncing={setSyncing}
        />
      ),
      status: finishUpStepStatus,
      title: i18n.translate('xpack.enterpriseSearch.createConnector.finishUpStep.finishUpLabel', {
        defaultMessage: 'Finish up',
      }),
    },
  ];

  const elasticManagedSteps: CustomEuiStepInterface[] = [
    {
      children: <EuiSpacer size="xs" />,
      content: (
        <StartStep
          title={i18n.translate('xpack.enterpriseSearch.createConnector.startStep.startLabel', {
            defaultMessage: 'Start',
          })}
          setSelfManaged={setSelfManaged}
          selfManaged={selfManaged}
          setConnectorSelected={setConnectorSelected}
          connectorSelected={connectorSelected}
          allConnectors={allConnectors}
          connectorName={connectorName}
          setConnectorName={setConnectorName}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          isNextStepEnabled={configurationStepComplete}
          setNextStepEnabled={setConfigurationStepComplete}
          connector={connector}
          error={errorToText(error)}
          onNameChange={() => {
            apiReset();
          }}
          onSubmit={(name) =>
            createConnector({
              isNative,
              language: null,
              name,
              serviceType,
            })
          }
        />
      ),
      status: startStepStatus,
      title: i18n.translate('xpack.enterpriseSearch.createConnector.startStep.startLabel', {
        defaultMessage: i18n.translate(
          'xpack.enterpriseSearch.createConnector.startStep.startLabel',
          {
            defaultMessage: 'Start',
          }
        ),
      }),
    },
    {
      children: '',
      content: (
        <ConfigurationStep
          title={i18n.translate(
            'xpack.enterpriseSearch.createConnector.configurationStep.configurationLabel',
            { defaultMessage: 'Configuration' }
          )}
          connector={connector}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          isNextStepEnabled={finishUpStepComplete}
          setNextStepEnabled={setFinishUpStepComplete}
          syncing={syncing}
          setSyncing={setSyncing}
        />
      ),
      status: configurationStepStatus,
      title: i18n.translate(
        'xpack.enterpriseSearch.createConnector.configurationStep.configurationLabel',
        { defaultMessage: 'Configuration' }
      ),
    },
    {
      children: '',
      content: (
        <FinishUpStep
          title={i18n.translate(
            'xpack.enterpriseSearch.createConnector.finishUpStep.finishUpLabel',
            { defaultMessage: 'Finish up' }
          )}
          syncing={syncing}
          setSyncing={setSyncing}
        />
      ),
      status: finishUpStepStatus,
      title: i18n.translate('xpack.enterpriseSearch.createConnector.finishUpStep.finishUpLabel', {
        defaultMessage: 'Finish up',
      }),
    },
  ];

  useEffect(() => {
    if (selfManaged === true) {
      switch (currentStep) {
        case 0:
          setStartStepStatus('current');
          setDeploymentStepStatus('incomplete');
          setConfigurationStepStatus('incomplete');
          setFinishUpStepStatus('incomplete');
          break;
        case 1:
          setStartStepStatus('complete');
          setDeploymentStepStatus('current');
          setConfigurationStepStatus('incomplete');
          setFinishUpStepStatus('incomplete');
          break;
        case 2:
          setStartStepStatus('complete');
          setDeploymentStepStatus('complete');
          setConfigurationStepStatus('current');
          setFinishUpStepStatus('incomplete');
          break;
        case 3:
          setStartStepStatus('complete');
          setDeploymentStepStatus('complete');
          setConfigurationStepStatus('complete');
          setFinishUpStepStatus('current');
          break;
        default:
          break;
      }
    } else {
      switch (currentStep) {
        case 0:
          setStartStepStatus('current');
          setConfigurationStepStatus('incomplete');
          setFinishUpStepStatus('incomplete');
          break;
        case 1:
          setStartStepStatus('complete');
          setConfigurationStepStatus('current');
          setFinishUpStepStatus('incomplete');
          break;
        case 2:
          setStartStepStatus('complete');
          setConfigurationStepStatus('complete');
          setFinishUpStepStatus('current');
          break;
        default:
          break;
      }
    }
  }, [currentStep]);

  useEffect(() => {
    isNative = connectorSelected.isNative;
    serviceType = connectorSelected.serviceType;
  }, [connectorSelected]);

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[
        ...connectorsBreadcrumbs,
        i18n.translate('xpack.enterpriseSearch.createConnector..breadcrumb', {
          defaultMessage: 'New connector',
        }),
      ]}
      pageViewTelemetry="create_connector"
      isLoading={false}
      pageHeader={{
        description: i18n.translate('xpack.enterpriseSearch.createConnector.description', {
          defaultMessage: 'Extract, transform, index and sync data from a third-party data source.',
        }),
        pageTitle: i18n.translate('xpack.enterpriseSearch.createConnector..title', {
          defaultMessage: 'Create a connector',
        }),
      }}
    >
      <EuiFlexGroup gutterSize="m">
        {/* Col 1 */}
        <EuiFlexItem grow={2}>
          <EuiPanel
            hasShadow={false}
            hasBorder
            color="subdued"
            paddingSize="l"
            css={css`
              ${currentStep === 0 ? `background-image: url(${connectorsBackgroundImage});` : ''}
              background-size: contain;
              background-repeat: no-repeat;
              background-position: bottom center;
              min-height: 550px;
              border: 1px solid ${euiTheme.colors.lightShade};
            `}
          >
            {currentStep > 0 && (
              <>
                <EuiFlexGroup>
                  <EuiButtonEmpty
                    data-test-subj="enterpriseSearchCreateConnectorBackButton"
                    iconType="arrowLeft"
                    size="s"
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    {Constants.BACK_BUTTON_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexGroup>
                <EuiSpacer size="xl" />
              </>
            )}

            <EuiSteps
              titleSize="xxs"
              steps={selfManaged === true ? selfManagedSteps : elasticManagedSteps}
              css={() => css`
                .euiStep__content {
                  padding-block-end: ${euiTheme.size.xs};
                }
              `}
            />
            <EuiSpacer size="xl" />
            {connectorSelected.docsUrl && connectorSelected.docsUrl !== '' && (
              <>
                <EuiText size="s">
                  <p>
                    <EuiLink
                      external
                      data-test-subj="enterpriseSearchCreateConnectorConnectorDocsLink"
                      href={connectorSelected.docsUrl}
                      target="_blank"
                    >
                      {'Elastic '}
                      {connectorSelected.name}
                      {i18n.translate(
                        'xpack.enterpriseSearch.createConnector.connectorDocsLinkLabel',
                        { defaultMessage: ' connector reference' }
                      )}
                    </EuiLink>
                  </p>
                </EuiText>
                <EuiSpacer size="s" />
              </>
            )}
            {currentStep > 0 && (
              <>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.euiFormRow.connectorLabel',
                    { defaultMessage: 'Connector' }
                  )}
                >
                  <EuiSuperSelect
                    readOnly
                    valueOfSelected="item1"
                    options={[
                      {
                        inputDisplay: (
                          <>
                            <EuiIcon
                              size="l"
                              type={connectorSelected.iconPath}
                              css={css`
                                margin-right: ${euiTheme.size.m};
                              `}
                            />
                            {connectorSelected.name}
                          </>
                        ),
                        value: 'item1',
                      },
                    ]}
                  />
                </EuiFormRow>
                <EuiSpacer size="s" />
                <EuiBadge color="hollow">
                  {selfManaged
                    ? i18n.translate(
                        'xpack.enterpriseSearch.createConnector.badgeType.selfManaged',
                        {
                          defaultMessage: 'Self managed',
                        }
                      )
                    : i18n.translate(
                        'xpack.enterpriseSearch.createConnector.badgeType.ElasticManaged',
                        {
                          defaultMessage: 'Elastic managed',
                        }
                      )}
                </EuiBadge>
              </>
            )}
          </EuiPanel>
        </EuiFlexItem>
        {/* Col 2 */}
        <EuiFlexItem grow={7}>
          {selfManaged === true
            ? selfManagedSteps[currentStep].content
            : elasticManagedSteps[currentStep].content}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EnterpriseSearchContentPageTemplate>
  );
};
