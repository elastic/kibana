/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';

import { Connector, ConnectorStatus } from '@kbn/search-connectors';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiStepsHorizontal,
  EuiStepsHorizontalProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConnectorLinkElasticsearch } from './connector_link';

interface ConnectorConfigurationProps {
  connector: Connector;
}

type ConnectorConfigurationStep = 'link' | 'configure' | 'connect';

export const ConnectorConfiguration: React.FC<ConnectorConfigurationProps> = ({ connector }) => {
  const [currentStep, setCurrentStep] = useState<ConnectorConfigurationStep>('link');
  useEffect(() => {
    const step =
      connector.status === ConnectorStatus.CREATED
        ? 'link'
        : connector.status === ConnectorStatus.NEEDS_CONFIGURATION
        ? 'configure'
        : 'connect';
    setCurrentStep(step);
  }, [connector.status, setCurrentStep]);
  const steps: EuiStepsHorizontalProps['steps'] = [
    {
      title: i18n.translate('xpack.serverlessSearch.connectors.config.linkToElasticTitle', {
        defaultMessage: 'Link to Elasticsearch',
      }),
      status:
        currentStep === 'link'
          ? 'current'
          : connector.status === ConnectorStatus.CREATED
          ? 'incomplete'
          : 'complete',
      onClick: () => setCurrentStep('link'),
      size: 's',
    },
    {
      title: i18n.translate('xpack.serverlessSearch.connectors.config.configureTitle', {
        defaultMessage: 'Configure',
      }),
      status:
        currentStep === 'configure'
          ? 'current'
          : connector.status === ConnectorStatus.CONFIGURED ||
            connector.status === ConnectorStatus.CONNECTED
          ? 'complete'
          : 'incomplete',
      onClick: () => setCurrentStep('configure'),
      size: 's',
    },
    {
      title: i18n.translate('xpack.serverlessSearch.connectors.config.connectTitle', {
        defaultMessage: 'Connect Index',
      }),
      status:
        currentStep === 'connect'
          ? 'current'
          : connector.status === ConnectorStatus.CONNECTED && connector.index_name
          ? 'complete'
          : 'incomplete',
      onClick: () => setCurrentStep('connect'),
      size: 's',
    },
  ];
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiStepsHorizontal size="s" steps={steps} />
      </EuiFlexItem>
      <EuiFlexItem>
        {currentStep === 'link' && (
          <ConnectorLinkElasticsearch
            connectorId={connector.id}
            serviceType={connector.service_type || ''}
            status={connector.status}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
