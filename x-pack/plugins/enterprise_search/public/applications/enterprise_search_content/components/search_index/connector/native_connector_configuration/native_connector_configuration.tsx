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
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { NATIVE_CONNECTOR_ICONS } from '../../../../../../assets/source_icons/native_connector_icons';
import { docLinks } from '../../../../../shared/doc_links';

import { hasConfiguredConfiguration } from '../../../../utils/has_configured_configuration';
import { isConnectorIndex } from '../../../../utils/indices';
import { IndexViewLogic } from '../../index_view_logic';
import { ConnectorNameAndDescription } from '../connector_name_and_description/connector_name_and_description';
import { NATIVE_CONNECTORS } from '../constants';

import { NativeConnectorAdvancedConfiguration } from './native_connector_advanced_configuration';
import { NativeConnectorConfigurationConfig } from './native_connector_configuration_config';
import { ResearchConfiguration } from './research_configuration';

export const NativeConnectorConfiguration: React.FC = () => {
  const { index } = useValues(IndexViewLogic);

  if (!isConnectorIndex(index)) {
    return <></>;
  }

  const nativeConnector = NATIVE_CONNECTORS.find(
    (connector) => connector.serviceType === index.connector.service_type
  );

  if (!nativeConnector) {
    return <></>;
  }

  const hasDescription = !!index.connector.description;
  const hasConfigured = hasConfiguredConfiguration(index.connector.configuration);
  const hasConfiguredAdvanced = index.connector.last_synced || index.connector.scheduling.enabled;
  const hasResearched = hasDescription || hasConfigured || hasConfiguredAdvanced;

  const icon = NATIVE_CONNECTOR_ICONS[nativeConnector.serviceType];
  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiPanel hasShadow={false} hasBorder>
            <EuiFlexGroup gutterSize="m" direction="row" alignItems="center">
              {icon && (
                <EuiFlexItem grow={false}>
                  <EuiIcon size="xl" type={icon} />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiTitle size="m">
                  <h3>{nativeConnector.name}</h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <EuiSteps
              steps={[
                {
                  children: <ResearchConfiguration nativeConnector={nativeConnector} />,
                  status: hasResearched ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.steps.researchConfigurationTitle',
                    {
                      defaultMessage: 'Research configuration requirements',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: <ConnectorNameAndDescription />,
                  status: hasDescription ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.steps.nameAndDescriptionTitle',
                    {
                      defaultMessage: 'Name and description',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: (
                    <NativeConnectorConfigurationConfig
                      nativeConnector={nativeConnector}
                      status={index.connector.status}
                    />
                  ),
                  status: hasConfigured ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.steps.configurationTitle',
                    {
                      defaultMessage: 'Configuration',
                    }
                  ),
                  titleSize: 'xs',
                },
                {
                  children: <NativeConnectorAdvancedConfiguration />,
                  status: hasConfiguredAdvanced ? 'complete' : 'incomplete',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.steps.advancedConfigurationTitle',
                    {
                      defaultMessage: 'Advanced configuration',
                    }
                  ),
                  titleSize: 'xs',
                },
              ]}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder hasShadow={false}>
                <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="clock" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="xxs">
                      <h4>
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.schedulingReminder.title',
                          {
                            defaultMessage: 'Configurable sync schedule',
                          }
                        )}
                      </h4>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.schedulingReminder.description',
                    {
                      defaultMessage:
                        'Remember to set a sync schedule in the Scheduling tab to continually refresh your searchable data.',
                    }
                  )}
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder hasShadow={false}>
                <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="globe" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="xxs">
                      <h4>
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.securityReminder.title',
                          {
                            defaultMessage: 'Document level security',
                          }
                        )}
                      </h4>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.securityReminder.description',
                    {
                      defaultMessage:
                        'Restrict and personalize the read access users have to the index documents at query time.',
                    }
                  )}
                  <EuiSpacer size="s" />
                  <EuiLink href={docLinks.documentLevelSecurity} target="_blank">
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.securityReminder.securityLinkLabel',
                      {
                        defaultMessage: 'Document level security',
                      }
                    )}
                  </EuiLink>
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
