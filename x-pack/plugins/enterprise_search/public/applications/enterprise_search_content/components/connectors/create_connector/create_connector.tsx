/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { css } from '@emotion/react';

import { useValues } from 'kea';

import {
  EuiBadge,
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

import { AddConnectorApiLogic } from '../../../api/connector/add_connector_api_logic';
import { EnterpriseSearchContentPageTemplate } from '../../layout';
import { NewConnectorLogic } from '../../new_index/method_connector/new_connector_logic';
import { errorToText } from '../../new_index/utils/error_to_text';
import { connectorsBreadcrumbs } from '../connectors';

import connectorsBackgroundImage from './assets/connector_logos_comp.png';

import { ConfigurationStep } from './configuration_step';
import { DeploymentStep } from './deployment_step';
import { FinishUpStep } from './finish_up_step';
import { StartStep } from './start_step';

export type SelfManagePreference = 'native' | 'selfManaged';
export const CreateConnector: React.FC = () => {
  const { error } = useValues(AddConnectorApiLogic);
  const { euiTheme } = useEuiTheme();
  const [selfManagePreference, setSelfManagePreference] = useState<SelfManagePreference>('native');

  const [startStepStatus, setStartStepStatus] = useState<EuiStepStatus>('current');
  const [deploymentStepStatus, setDeploymentStepStatus] = useState<EuiStepStatus>('incomplete');
  const [configurationStepStatus, setConfigurationStepStatus] =
    useState<EuiStepStatus>('incomplete');
  const [finishUpStepStatus, setFinishUpStepStatus] = useState<EuiStepStatus>('incomplete');
  const [currentStep, setCurrentStep] = useState(0);
  const [configurationStepComplete] = useState(false);
  const { selectedConnector } = useValues(NewConnectorLogic);

  useEffect(() => {
    // TODO: separate this to ability and preference
    if (!selectedConnector?.isNative || !selfManagePreference) {
      setSelfManagePreference('selfManaged');
    } else {
      setSelfManagePreference('native');
    }
  }, [selectedConnector]);

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
          currentStep={currentStep}
          selfManagePreference={selfManagePreference}
          setCurrentStep={setCurrentStep}
          onSelfManagePreferenceChange={(preference) => {
            setSelfManagePreference(preference);
          }}
          error={errorToText(error)}
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
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
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
          selfManagePreference={selfManagePreference}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          onSelfManagePreferenceChange={(preference) => {
            setSelfManagePreference(preference);
          }}
          error={errorToText(error)}
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
          // connector={connector}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
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
        />
      ),
      status: finishUpStepStatus,
      title: i18n.translate('xpack.enterpriseSearch.createConnector.finishUpStep.finishUpLabel', {
        defaultMessage: 'Finish up',
      }),
    },
  ];

  useEffect(() => {
    if (selfManagePreference === 'selfManaged') {
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
            <EuiSteps
              titleSize="xxs"
              steps={
                selfManagePreference === 'selfManaged' ? selfManagedSteps : elasticManagedSteps
              }
              css={() => css`
                .euiStep__content {
                  padding-block-end: ${euiTheme.size.xs};
                }
              `}
            />
            <EuiSpacer size="xl" />
            {selectedConnector?.docsUrl && selectedConnector?.docsUrl !== '' && (
              <>
                <EuiText size="s">
                  <p>
                    <EuiLink
                      external
                      data-test-subj="enterpriseSearchCreateConnectorConnectorDocsLink"
                      href={selectedConnector?.docsUrl}
                      target="_blank"
                    >
                      {'Elastic '}
                      {selectedConnector?.name}
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
                              type={selectedConnector?.iconPath ?? ''}
                              css={css`
                                margin-right: ${euiTheme.size.m};
                              `}
                            />
                            {selectedConnector?.name}
                          </>
                        ),
                        value: 'item1',
                      },
                    ]}
                  />
                </EuiFormRow>
                <EuiSpacer size="s" />
                <EuiBadge color="hollow">
                  {selfManagePreference
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
          {selfManagePreference === 'selfManaged'
            ? selfManagedSteps[currentStep].content
            : elasticManagedSteps[currentStep].content}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EnterpriseSearchContentPageTemplate>
  );
};
