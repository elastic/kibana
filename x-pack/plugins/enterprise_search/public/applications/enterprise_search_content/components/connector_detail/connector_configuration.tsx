/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiCallOut,
  EuiButton,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { ConnectorConfigurationComponent, ConnectorStatus } from '@kbn/search-connectors';

import { EXAMPLE_CONNECTOR_SERVICE_TYPES } from '../../../../../common/constants';

import { Status } from '../../../../../common/types/api';
import { docLinks } from '../../../shared/doc_links';
import { HttpLogic } from '../../../shared/http';
import { LicensingLogic } from '../../../shared/licensing';
import { isLastSeenOld } from '../../utils/connector_status_helpers';
import { isAdvancedSyncRuleSnippetEmpty } from '../../utils/sync_rules_helpers';

import { ConnectorFilteringLogic } from '../search_index/connector/sync_rules/connector_filtering_logic';

import { AttachIndexBox } from './attach_index_box';
import { ConnectorViewLogic } from './connector_view_logic';
import { NativeConnectorConfiguration } from './native_connector_configuration';

export const ConnectorConfiguration: React.FC = () => {
  const {
    index,
    isLoading,
    connector,
    updateConnectorConfigurationStatus,
    hasAdvancedFilteringFeature,
  } = useValues(ConnectorViewLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { http } = useValues(HttpLogic);
  const { advancedSnippet } = useValues(ConnectorFilteringLogic);
  const isAdvancedSnippetEmpty = isAdvancedSyncRuleSnippetEmpty(advancedSnippet);

  const { fetchConnector, updateConnectorConfiguration } = useActions(ConnectorViewLogic);

  if (!connector) {
    return <></>;
  }

  if (connector.is_native && connector.service_type) {
    return <NativeConnectorConfiguration />;
  }

  const isWaitingForConnector = !connector.status || connector.status === ConnectorStatus.CREATED;

  return (
    <>
      <EuiSpacer />
      {
        // TODO remove this callout when example status is removed
        connector &&
          connector.service_type &&
          EXAMPLE_CONNECTOR_SERVICE_TYPES.includes(connector.service_type) && (
            <>
              <EuiCallOut
                iconType="iInCircle"
                color="warning"
                title={i18n.translate(
                  'xpack.enterpriseSearch.content.connectors.overview.connectorUnsupportedCallOut.title',
                  {
                    defaultMessage: 'Example connector',
                  }
                )}
              >
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.connectors.overview.connectorUnsupportedCallOut.description"
                    defaultMessage="This is an example connector that serves as a building block for customizations. The design and code is being provided as-is with no warranties. This is not subject to the SLA of supported features."
                  />
                </EuiText>
              </EuiCallOut>
              <EuiSpacer />
            </>
          )
      }
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiPanel hasShadow={false} hasBorder>
            {connector.index_name && (
              <>
                <EuiSpacer />
                <ConnectorConfigurationComponent
                  connector={connector}
                  hasPlatinumLicense={hasPlatinumLicense}
                  isLoading={updateConnectorConfigurationStatus === Status.LOADING}
                  saveConfig={(configuration) =>
                    updateConnectorConfiguration({
                      configuration,
                      connectorId: connector.id,
                    })
                  }
                  subscriptionLink={docLinks.licenseManagement}
                  stackManagementLink={http.basePath.prepend(
                    '/app/management/stack/license_management'
                  )}
                >
                  {isWaitingForConnector ? (
                    <EuiCallOut
                      title={i18n.translate(
                        'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.waitingForConnectorTitle',
                        {
                          defaultMessage: 'Waiting for your connector',
                        }
                      )}
                      iconType="iInCircle"
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.waitingForConnectorText',
                        {
                          defaultMessage:
                            'Your connector has not connected to Search. Troubleshoot your configuration and refresh the page.',
                        }
                      )}
                      <EuiSpacer size="s" />
                      <EuiButton
                        disabled={!index}
                        data-test-subj="entSearchContent-connector-configuration-recheckNow"
                        data-telemetry-id="entSearchContent-connector-configuration-recheckNow"
                        iconType="refresh"
                        onClick={() => fetchConnector({ connectorId: connector.id })}
                        isLoading={isLoading}
                      >
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.waitingForConnector.button.label',
                          {
                            defaultMessage: 'Recheck now',
                          }
                        )}
                      </EuiButton>
                    </EuiCallOut>
                  ) : (
                    !isLastSeenOld(connector) && (
                      <EuiCallOut
                        iconType="check"
                        color="success"
                        title={i18n.translate(
                          'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.connectorConnected',
                          {
                            defaultMessage:
                              'Your connector {name} has connected to Search successfully.',
                            values: { name: connector.name },
                          }
                        )}
                      />
                    )
                  )}
                  <EuiSpacer size="s" />
                  {connector.status && hasAdvancedFilteringFeature && !isAdvancedSnippetEmpty && (
                    <EuiCallOut
                      title={i18n.translate(
                        'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.advancedRulesCallout',
                        { defaultMessage: 'Configuration warning' }
                      )}
                      iconType="iInCircle"
                      color="warning"
                    >
                      <FormattedMessage
                        id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.advancedRulesCallout.description"
                        defaultMessage="{advancedSyncRulesDocs} can override some configuration fields."
                        values={{
                          advancedSyncRulesDocs: (
                            <EuiLink
                              data-test-subj="entSearchContent-connector-configuration-advancedSyncRulesDocsLink"
                              data-telemetry-id="entSearchContent-connector-configuration-advancedSyncRulesDocsLink"
                              href={docLinks.syncRules}
                              target="_blank"
                            >
                              {i18n.translate(
                                'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.advancedSyncRulesDocs',
                                { defaultMessage: 'Advanced Sync Rules' }
                              )}
                            </EuiLink>
                          ),
                        }}
                      />
                    </EuiCallOut>
                  )}
                </ConnectorConfigurationComponent>
              </>
            )}
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <AttachIndexBox connector={connector} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
