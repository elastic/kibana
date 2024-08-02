/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiSpacer, EuiLink, EuiFlexGroup, EuiFlexItem, EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import { Connector, ConnectorStatus } from '@kbn/search-connectors';

import { ConnectorConfigurationComponent } from '@kbn/search-connectors/components/configuration/connector_configuration';

import { ConnectorDefinition } from '@kbn/search-connectors-plugin/common/types';

import { Status } from '../../../../../../../common/types/api';

import { docLinks } from '../../../../../shared/doc_links';
import { HttpLogic } from '../../../../../shared/http';
import { LicensingLogic } from '../../../../../shared/licensing';

import { ConnectorConfigurationApiLogic } from '../../../../api/connector/update_connector_configuration_api_logic';
import { isAdvancedSyncRuleSnippetEmpty } from '../../../../utils/sync_rules_helpers';
import { ConnectorViewLogic } from '../../../connector_detail/connector_view_logic';
import { ConnectorFilteringLogic } from '../sync_rules/connector_filtering_logic';

interface NativeConnectorConfigurationConfigProps {
  connector: Connector;
  nativeConnector: ConnectorDefinition;
  status: ConnectorStatus;
}

export const NativeConnectorConfigurationConfig: React.FC<
  NativeConnectorConfigurationConfigProps
> = ({ connector, nativeConnector }) => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { status: updateStatus } = useValues(ConnectorConfigurationApiLogic);
  const { makeRequest } = useActions(ConnectorConfigurationApiLogic);
  const { hasAdvancedFilteringFeature } = useValues(ConnectorViewLogic);
  const { advancedSnippet } = useValues(ConnectorFilteringLogic);
  const { http } = useValues(HttpLogic);
  const isAdvancedSnippetEmpty = isAdvancedSyncRuleSnippetEmpty(advancedSnippet);

  return (
    <ConnectorConfigurationComponent
      connector={connector}
      hasPlatinumLicense={hasPlatinumLicense}
      isLoading={updateStatus === Status.LOADING}
      saveConfig={(configuration) =>
        makeRequest({
          configuration,
          connectorId: connector.id,
        })
      }
      subscriptionLink={docLinks.licenseManagement}
      stackManagementLink={http.basePath.prepend('/app/management/stack/license_management')}
    >
      <EuiFlexGroup direction="row">
        {nativeConnector.externalAuthDocsUrl && (
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj="entSearchContent-connector-nativeConnector-configNameAuthenticationLink"
              data-telemetry-id="entSearchContent-connector-nativeConnector-configNameAuthenticationLink"
              href={nativeConnector.externalAuthDocsUrl}
              target="_blank"
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.config.sourceSecurityDocumentationLinkLabel',
                {
                  defaultMessage: '{name} authentication',
                  values: {
                    name: nativeConnector.name,
                  },
                }
              )}
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {connector.status && hasAdvancedFilteringFeature && !isAdvancedSnippetEmpty && (
        <>
          <EuiSpacer size="l" />
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
                    data-test-subj="entSearchContent-connector-nativeConnector-advancedSyncRulesDocsLink"
                    data-telemetry-id="entSearchContent-connector-nativeConnector-advancedSyncRulesDocsLink"
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
        </>
      )}
    </ConnectorConfigurationComponent>
  );
};
