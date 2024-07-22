/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiRadio,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n-react';

import { ChooseConnectorSelectable } from './components/choose_connector_selectable';
import { ConnectorDescriptionPopover } from './components/connector_description_popover';

interface StartStepProps {
  allConnectors: Array<{
    description: string;
    iconPath: string;
    isBeta: boolean;
    isNative: boolean;
    isTechPreview: boolean;
    name: string;
  }>;
  connectorName: string;
  connectorSelected: {
    description: string;
    iconPath: string;
    isBeta: boolean;
    isNative: boolean;
    isTechPreview: boolean;
    name: string;
  };
  currentStep: number;
  isNextStepEnabled: boolean;
  selfManaged: boolean;
  setConnectorName: Function;
  setConnectorSelected: Function;
  setCurrentStep: Function;
  setNextStepEnabled: Function;
  setSelfManaged: Function;
  title: string;
}

export const StartStep: React.FC<StartStepProps> = ({
  setSelfManaged,
  title,
  selfManaged,
  setConnectorSelected,
  connectorSelected,
  allConnectors,
  connectorName,
  setConnectorName,
  currentStep,
  setCurrentStep,
  isNextStepEnabled,
  setNextStepEnabled,
}) => {
  const elasticManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'elasticManagedRadioButton' });
  const selfManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'selfManagedRadioButton' });
  const [radioIdSelected, setRadioIdSelected] = useState(
    selfManaged ? selfManagedRadioButtonId : elasticManagedRadioButtonId
  );

  useEffect(() => {
    setSelfManaged(radioIdSelected === selfManagedRadioButtonId ? true : false);
  }, [radioIdSelected]);
  useEffect(() => {
    setRadioIdSelected(selfManaged ? selfManagedRadioButtonId : elasticManagedRadioButtonId);
  }, [selfManaged]);

  useEffect(() => {
    // console.log('connectorSelected', connectorSelected);
    if (connectorSelected && connectorSelected.name !== '') {
      const name =
        connectorSelected.name
          .toLocaleLowerCase()
          .replace(/[^\w-]/g, '')
          .replace(/ /g, '-') + '-aa3f';
      setConnectorName(name);
    }
  }, [connectorSelected]);

  return (
    <>
      <EuiFlexGroup gutterSize="m" direction="column">
        {/* Start */}
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="m">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.enterpriseSearch.startStep.euiFormRow.connectorLabel',
                    { defaultMessage: 'Connector' }
                  )}
                >
                  <ChooseConnectorSelectable
                    selfManaged={selfManaged}
                    setConnectorSelected={setConnectorSelected}
                    connectorSelected={connectorSelected}
                    allConnectors={allConnectors}
                    setSelfManaged={setSelfManaged}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.enterpriseSearch.startStep.euiFormRow.connectorNameLabel',
                    { defaultMessage: 'Connector name' }
                  )}
                >
                  <EuiFieldText
                    data-test-subj="enterpriseSearchStartStepFieldText"
                    fullWidth
                    name="first"
                    value={connectorName}
                    onChange={(e) => {
                      if (e.target.value !== connectorName) {
                        setConnectorName(e.target.value);
                      }
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.enterpriseSearch.startStep.euiFormRow.descriptionLabel',
                  { defaultMessage: 'Description' }
                )}
              >
                <EuiFieldText
                  data-test-subj="enterpriseSearchStartStepFieldText"
                  fullWidth
                  name="first"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>
        {/* Set up */}
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="s">
              <h4>
                {i18n.translate('xpack.enterpriseSearch.startStep.h4.setUpLabel', {
                  defaultMessage: 'Set up',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.enterpriseSearch.startStep.p.whereDoYouWantLabel', {
                  defaultMessage:
                    'Where do you want to store the connector and how do you want to manage it?',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiRadio
                  id={elasticManagedRadioButtonId}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.startStep.euiRadio.elasticManagedLabel',
                    { defaultMessage: 'Elastic managed' }
                  )}
                  checked={!selfManaged}
                  disabled={connectorSelected.isNative === false}
                  onChange={() => setRadioIdSelected(elasticManagedRadioButtonId)}
                  name="setUp"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConnectorDescriptionPopover
                  isDisabled={connectorSelected.isNative === false}
                  isNative
                />
              </EuiFlexItem>
              &nbsp; &nbsp;
              <EuiFlexItem grow={false}>
                <EuiRadio
                  id={selfManagedRadioButtonId}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.startStep.euiRadio.selfManagedLabel',
                    { defaultMessage: 'Self managed' }
                  )}
                  checked={selfManaged}
                  onChange={() => setRadioIdSelected(selfManagedRadioButtonId)}
                  name="setUp"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConnectorDescriptionPopover isDisabled={false} isNative={false} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        {selfManaged ? (
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder paddingSize="l">
              <EuiTitle size="s">
                <h4>
                  {i18n.translate('xpack.enterpriseSearch.startStep.h4.deploymentLabel', {
                    defaultMessage: 'Deployment',
                  })}
                </h4>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText size="s">
                <p>
                  {i18n.translate('xpack.enterpriseSearch.startStep.p.youWillStartTheLabel', {
                    defaultMessage:
                      'You will start the process of creating a new index, API key, and a Web Crawler Connector ID manually. Optionally you can bring your own configuration as well.',
                  })}
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButton
                data-test-subj="enterpriseSearchStartStepNextButton"
                onClick={() => setCurrentStep(currentStep + 1)}
                fill
                disabled={connectorSelected.name === '' || connectorName === ''}
              >
                {i18n.translate('xpack.enterpriseSearch.startStep.nextButtonLabel', {
                  defaultMessage: 'Next',
                })}
              </EuiButton>
            </EuiPanel>
          </EuiFlexItem>
        ) : (
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder paddingSize="l">
              <EuiTitle size="s">
                <h4>
                  {i18n.translate('xpack.enterpriseSearch.startStep.h4.configureIndexAndAPILabel', {
                    defaultMessage: 'Configure index and API key',
                  })}
                </h4>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText size="s">
                <p>
                  {i18n.translate('xpack.enterpriseSearch.startStep.p.thisProcessWillCreateLabel', {
                    defaultMessage:
                      'This process will create a new index, API key, and a Connector ID. Optionally you can bring your own configuration as well.',
                  })}
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              {isNextStepEnabled ? (
                <EuiButton
                  data-test-subj="enterpriseSearchStartStepGenerateConfigurationButton"
                  fill
                  onClick={() => setCurrentStep(currentStep + 1)}
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.startStep.generateConfigurationButtonLabel',
                    { defaultMessage: 'Continue' }
                  )}
                </EuiButton>
              ) : (
                <EuiButton
                  data-test-subj="enterpriseSearchStartStepGenerateConfigurationButton"
                  iconType="sparkles"
                  fill
                  onClick={() => setNextStepEnabled(true)}
                  disabled={connectorSelected.name === '' || connectorName === ''}
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.startStep.generateConfigurationButtonLabel',
                    { defaultMessage: 'Generate configuration' }
                  )}
                </EuiButton>
              )}
            </EuiPanel>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
