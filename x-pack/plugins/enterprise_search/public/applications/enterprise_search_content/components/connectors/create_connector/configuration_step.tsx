/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiProgress,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// import { FormattedMessage } from '@kbn/i18n-react';
import { ConnectorConfigurationComponent, ConnectorStatus } from '@kbn/search-connectors';
import { Connector } from '@kbn/search-connectors/types/connectors';

import * as Constants from '../../../../shared/constants';

interface ConfigurationStepProps {
  currentStep: number;
  isNextStepEnabled: boolean;
  setCurrentStep: Function;
  setNextStepEnabled: Function;
  setSyncing: Function;
  syncing: boolean;
  title: string;
}

export const ConfigurationStep: React.FC<ConfigurationStepProps> = ({
  title,
  currentStep,
  setCurrentStep,
  isNextStepEnabled,
  setNextStepEnabled,
  setSyncing,
  syncing,
}) => {
  if (connector) {
    connector.status = 'created' as ConnectorStatus;
  }

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({
        behavior: 'smooth',
        top: 0,
      });
    }, 100);
  }, []);

  return (
    <>
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l" style={{ position: 'relative' }}>
            <EuiTitle size="m">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <ConnectorConfigurationComponent connector={connector} />
            <EuiSpacer size="m" />
            <EuiButtonEmpty
              size="s"
              data-test-subj="enterpriseSearchStartStepGenerateConfigurationButton"
              onClick={() => {
                setNextStepEnabled(true);
                setTimeout(() => {
                  window.scrollTo({
                    behavior: 'smooth',
                    top: window.innerHeight,
                  });
                }, 100);
              }}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.createConnector.configurationStep.button.simulateSave',
                {
                  defaultMessage: 'Simulates: Save',
                }
              )}
            </EuiButtonEmpty>
            <EuiButtonEmpty
              size="s"
              data-test-subj="enterpriseSearchStartStepGenerateConfigurationButton"
              onClick={() => {
                setSyncing(true);
                setNextStepEnabled(true);
                setTimeout(() => {
                  window.scrollTo({
                    behavior: 'smooth',
                    top: window.innerHeight,
                  });
                }, 100);
              }}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.createConnector.configurationStep.button.simulateSave',
                {
                  defaultMessage: 'Simulates: Save and sync',
                }
              )}
            </EuiButtonEmpty>
            {syncing && (
              <EuiProgress size="xs" position="absolute" style={{ top: 'calc(100% - 2px)' }} />
            )}
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel
            hasShadow={false}
            hasBorder
            paddingSize="l"
            color={isNextStepEnabled ? 'plain' : 'subdued'}
          >
            <EuiText color={isNextStepEnabled ? 'default' : 'subdued'}>
              <h3>
                {i18n.translate(
                  'xpack.enterpriseSearch.createConnector.configurationStep.h4.finishUpLabel',
                  {
                    defaultMessage: 'Finish up',
                  }
                )}
              </h3>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiText color={isNextStepEnabled ? 'default' : 'subdued'} size="s">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.createConnector.configurationStep.p.description',
                  {
                    defaultMessage:
                      'You can manually sync your data, schedule a recurring sync or manage your domains.',
                  }
                )}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiButton
              data-test-subj="enterpriseSearchStartStepGenerateConfigurationButton"
              onClick={() => setCurrentStep(currentStep + 1)}
              fill
              disabled={!isNextStepEnabled}
            >
              {Constants.NEXT_BUTTON_LABEL}
            </EuiButton>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
