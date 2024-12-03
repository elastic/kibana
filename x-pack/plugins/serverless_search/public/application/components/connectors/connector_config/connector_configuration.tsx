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
  EuiSpacer,
  EuiStepsHorizontal,
  EuiStepsHorizontalProps,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CONFIGURATION_LABEL,
  OVERVIEW_LABEL,
  SCHEDULING_LABEL,
} from '../../../../../common/i18n_string';
import { ConnectorLinkElasticsearch } from './connector_link';
import { ConnectorConfigFields } from './connector_config_fields';
import { ConnectorIndexName } from './connector_index_name';
import { ConnectorConfigurationPanels } from './connector_config_panels';
import { ConnectorOverview } from './connector_overview';
import { ConnectorScheduling } from '../conector_scheduling_tab/connector_scheduling';
import { useConnectors } from '../../../hooks/api/use_connectors';

interface ConnectorConfigurationProps {
  connector: Connector;
}

type ConnectorConfigurationStep = 'link' | 'configure' | 'connect' | 'connected';

export const ConnectorConfiguration: React.FC<ConnectorConfigurationProps> = ({ connector }) => {
  const { data } = useConnectors();
  const { canManageConnectors } = data || { canManageConnectors: false };
  const [currentStep, setCurrentStep] = useState<ConnectorConfigurationStep>('link');
  useEffect(() => {
    let step: ConnectorConfigurationStep = 'link';
    switch (connector.status) {
      case ConnectorStatus.CREATED:
        step = 'link';
        break;
      case ConnectorStatus.NEEDS_CONFIGURATION:
        step = Object.keys(connector.configuration || {}).length > 0 ? 'configure' : 'link';
        break;
      case ConnectorStatus.CONFIGURED:
        step = 'connect';
        break;
      default:
        step = 'connected';
    }
    setCurrentStep(step);
  }, [connector.status, setCurrentStep, connector.configuration]);
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

  const tabs: EuiTabbedContentTab[] = [
    {
      content: (
        <ConnectorOverview canManageConnectors={canManageConnectors} connector={connector} />
      ),
      id: 'overview',
      name: OVERVIEW_LABEL,
    },
    {
      content: (
        <>
          <EuiSpacer />
          <ConnectorConfigurationPanels
            canManageConnectors={canManageConnectors}
            connector={connector}
          />
        </>
      ),
      id: 'configuration',
      name: CONFIGURATION_LABEL,
    },
    {
      content: (
        <>
          <EuiSpacer />
          <ConnectorScheduling canManageConnectors={canManageConnectors} connector={connector} />
        </>
      ),
      id: 'scheduling',
      name: SCHEDULING_LABEL,
    },
  ];

  return currentStep === 'connected' ? (
    <EuiTabbedContent tabs={tabs} />
  ) : (
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
        {currentStep === 'configure' && (
          <ConnectorConfigFields connector={connector} isDisabled={!canManageConnectors} />
        )}
        {currentStep === 'connect' && (
          <ConnectorIndexName isDisabled={!canManageConnectors} connector={connector} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
