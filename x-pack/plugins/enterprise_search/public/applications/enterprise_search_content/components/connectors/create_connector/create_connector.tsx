/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

// import { useLocation } from 'react-router-dom';

import { css } from '@emotion/react';
// import { useValues } from 'kea';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  useEuiTheme,
} from '@elastic/eui';

import { EuiStepInterface } from '@elastic/eui/src/components/steps/step';
import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n-react';

import { EnterpriseSearchContentPageTemplate } from '../../layout';
import { connectorsBreadcrumbs } from '../connectors';

import connectorsBackgroundImage from './assets/connector_logos_comp.png';

import { ConfigurationStep } from './configuration_step';
import { DeploymentStep } from './deployment_step';
import { FinishUpStep } from './finish_up_step';
import { StartStep } from './start_step';

export const CreateConnector: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  const [selfManaged, setSelfManaged] = useState(false);

  const [startStepStatus, setStartStepStatus] = useState<
    | 'current'
    | 'incomplete'
    | 'disabled'
    | 'loading'
    | 'warning'
    | 'danger'
    | 'complete'
    | undefined
  >('current');

  const [deploymentStepStatus, setDeploymentStepStatus] = useState<
    | 'current'
    | 'incomplete'
    | 'disabled'
    | 'loading'
    | 'warning'
    | 'danger'
    | 'complete'
    | undefined
  >('incomplete');

  const [configurationStepStatus, setConfigurationStepStatus] = useState<
    | 'current'
    | 'incomplete'
    | 'disabled'
    | 'loading'
    | 'warning'
    | 'danger'
    | 'complete'
    | undefined
  >('incomplete');

  const [finishUpStepStatus, setFinishUpStepStatus] = useState<
    | 'current'
    | 'incomplete'
    | 'disabled'
    | 'loading'
    | 'warning'
    | 'danger'
    | 'complete'
    | undefined
  >('incomplete');


  interface CustomEuiStepInterface extends EuiStepInterface {
    content: JSX.Element;
  }
  const selfManagedSteps: CustomEuiStepInterface[] = [
    {
      title: 'Start',
      children: <EuiSpacer size="xs" />,
      status: startStepStatus,
      content: <StartStep title="Start" setSelfManaged={setSelfManaged} selfManaged={selfManaged}  />,
    },
    {
      title: 'Deployment',
      children: '',
      status: deploymentStepStatus,
      content: <DeploymentStep title="Deployment" />,
    },
    {
      title: 'Configuration',
      children: '',
      status: configurationStepStatus,
      content: <ConfigurationStep title="Configuration" />,
    },
    {
      title: 'Finish up',
      children: '',
      status: finishUpStepStatus,
      content: <FinishUpStep title="Finish up" />,
    },
  ];

  const elasticManagedSteps: CustomEuiStepInterface[] = [
    {
      title: 'Start',
      children: <EuiSpacer size="xs" />,
      status: startStepStatus,
      content: <StartStep title="Start" setSelfManaged={setSelfManaged} selfManaged={selfManaged} />,
    },
    {
      title: 'Configuration',
      children: '',
      status: configurationStepStatus,
      content: <ConfigurationStep title="Configuration" />,
    },
    {
      title: 'Finish up',
      children: '',
      status: finishUpStepStatus,
      content: <FinishUpStep title="Finish up" />,
    },
  ];

  const [currentStep, setCurrentStep] = useState(0);

  const updateStep = (action: string) => {
    const allSteps = selfManaged === true ? selfManagedSteps : elasticManagedSteps;
    switch (action) {
      case 'next':
        if (currentStep === allSteps.length - 1) {
          return;
        }
        setCurrentStep(currentStep + 1);
        break;
      case 'back':
        if (currentStep === 0) {
          return;
        }
        setCurrentStep(currentStep - 1);
        break;
      default:
        break;
    }
  };

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

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[
        ...connectorsBreadcrumbs,
        i18n.translate('xpack.enterpriseSearch.content.indices.selectConnector.breadcrumb', {
          defaultMessage: 'New connector',
        }),
      ]}
      pageViewTelemetry="create_connector"
      isLoading={false}
      pageHeader={{
        description: i18n.translate(
          'xpack.enterpriseSearch.content.indices.selectConnector.description',
          {
            defaultMessage:
              'Extract, transform, index and sync data from a third-party data source.',
          }
        ),
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.indices.selectConnector.title', {
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
              background-image: url(${connectorsBackgroundImage});
              background-size: contain;
              background-repeat: no-repeat;
              background-position: bottom center;
              min-height: 600px;
            `}
          >
            <EuiFlexGroup>
              <EuiButtonEmpty iconType="arrowLeft" size="s" onClick={() => updateStep('back')}>
                Back
              </EuiButtonEmpty>
              <EuiButtonEmpty
                iconSide="right"
                iconType="arrowRight"
                size="s"
                onClick={() => updateStep('next')}
              >
                Next
              </EuiButtonEmpty>
            </EuiFlexGroup>

            <EuiSpacer size="xl" />
            <EuiSteps
              titleSize="xxs"
              steps={selfManaged === true ? selfManagedSteps : elasticManagedSteps}
              css={({ euiTheme }) => css`
                .euiStep__content {
                  padding-block-end: ${euiTheme.size.m};
                }
              `}
            />
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
