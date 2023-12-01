/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import { useLocation } from 'react-router-dom';

import { css } from '@emotion/react';
import { useValues } from 'kea';

import {
  EuiBadge,
  EuiButton,
  EuiFacetButton,
  EuiFacetGroup,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { INGESTION_METHOD_IDS } from '../../../../../../common/constants';

import { BACK_BUTTON_LABEL } from '../../../../shared/constants';
import { generateEncodedPath } from '../../../../shared/encode_path_params';

import { KibanaLogic } from '../../../../shared/kibana';
import { LicensingLogic } from '../../../../shared/licensing';
import { parseQueryParams } from '../../../../shared/query_params';

import { NEW_INDEX_METHOD_PATH, NEW_INDEX_PATH } from '../../../routes';
import { EnterpriseSearchContentPageTemplate } from '../../layout';

import { CONNECTORS } from '../../search_index/connector/constants';

import { baseBreadcrumbs } from '../../search_indices';

import { ConnectorCheckable } from './connector_checkable';

export const SelectConnector: React.FC = () => {
  const { search } = useLocation();
  const { isCloud } = useValues(KibanaLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const hasNativeAccess = isCloud;
  const { filter } = parseQueryParams(search);
  const [selectedConnectorFilter, setSelectedConnectorFilter] = useState<string | null>(
    Array.isArray(filter) ? filter[0] : filter ?? null
  );
  const useNativeFilter = selectedConnectorFilter === 'native';
  const useClientsFilter = selectedConnectorFilter === 'connector_clients';
  const [showTechPreview, setShowTechPreview] = useState(true);
  const [showBeta, setShowBeta] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const filteredConnectors = useMemo(() => {
    const nativeConnectors = hasNativeAccess
      ? CONNECTORS.filter((connector) => connector.isNative).sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      : [];
    const nonNativeConnectors = hasNativeAccess
      ? CONNECTORS.filter((connector) => !connector.isNative).sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      : CONNECTORS.sort((a, b) => a.name.localeCompare(b.name));
    const connectors = [...nativeConnectors, ...nonNativeConnectors];
    return connectors
      .filter((connector) => (showBeta ? true : !connector.isBeta))
      .filter((connector) => (showTechPreview ? true : !connector.isTechPreview))
      .filter((connector) => (useNativeFilter ? connector.isNative : true))
      .filter((connector) =>
        searchTerm ? connector.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
      );
  }, [showBeta, showTechPreview, useNativeFilter, searchTerm]);
  const { euiTheme } = useEuiTheme();

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...baseBreadcrumbs, 'Select connector']}
      pageViewTelemetry="select_connector"
      isLoading={false}
      pageHeader={{
        description: i18n.translate(
          'xpack.enterpriseSearch.content.indices.selectConnector.description',
          {
            defaultMessage: "Choose which third-party data source you'd like to sync to Elastic.",
          }
        ),
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.indices.selectConnector.title', {
          defaultMessage: 'Select a connector',
        }),
      }}
    >
      <EuiFlexGroup>
        {/* Only facet is for native connectors, so only show facets if we can show native connectors */}
        {hasNativeAccess && (
          <EuiFlexItem
            grow={false}
            css={css`
              max-width: calc(${euiTheme.size.xxl} * 5);
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem grow={false}>
                <EuiFacetGroup>
                  <EuiFacetButton
                    quantity={CONNECTORS.length}
                    isSelected={!useNativeFilter && !useClientsFilter}
                    onClick={() => setSelectedConnectorFilter(null)}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.allConnectorsLabel',
                      { defaultMessage: 'All connectors' }
                    )}
                  </EuiFacetButton>
                  <EuiFacetButton
                    quantity={CONNECTORS.filter((connector) => connector.isNative).length}
                    isSelected={useNativeFilter}
                    onClick={() => setSelectedConnectorFilter(!useNativeFilter ? 'native' : null)}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.nativeLabel',
                      { defaultMessage: 'Native connectors' }
                    )}
                  </EuiFacetButton>
                  <EuiFacetButton
                    quantity={CONNECTORS.length}
                    isSelected={useClientsFilter}
                    onClick={() =>
                      setSelectedConnectorFilter(!useClientsFilter ? 'connector_clients' : null)
                    }
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.connectorClients',
                      { defaultMessage: 'Connector clients' }
                    )}
                  </EuiFacetButton>
                </EuiFacetGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiHorizontalRule margin="s" />
                <EuiPanel paddingSize="s" hasShadow={false}>
                  <EuiSwitch
                    checked={showBeta}
                    label={i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.showBetaLabel',
                      { defaultMessage: 'Display Beta connectors' }
                    )}
                    onChange={(e) => setShowBeta(e.target.checked)}
                  />
                  <EuiSwitch
                    checked={showTechPreview}
                    label={i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.showTechPreviewLabel',
                      { defaultMessage: 'Display Tech Preview connectors' }
                    )}
                    onChange={(e) => setShowTechPreview(e.target.checked)}
                  />
                </EuiPanel>
                <EuiSpacer size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiHorizontalRule margin="s" />
                <EuiPanel paddingSize="s" hasShadow={false} grow={false}>
                  <EuiTitle size="xs">
                    <h4>
                      {i18n.translate(
                        'xpack.enterpriseSearch.selectConnector.nativeConnectorsTitleLabel',
                        { defaultMessage: 'Native Connectors' }
                      )}
                    </h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiBadge iconSide="right" iconType="iInCircle">
                    {i18n.translate('xpack.enterpriseSearch.selectConnector.nativeBadgeLabel', {
                      defaultMessage: 'Native',
                    })}
                  </EuiBadge>
                  <EuiSpacer size="s" />
                  <EuiText size="xs" grow={false}>
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.selectConnector.p.areAvailableDirectlyWithinLabel',
                        {
                          defaultMessage:
                            'Are available directly within Elastic Cloud deployments No additional infrastructure is required You can also convert them as self hosted Connectors client at any moment',
                        }
                      )}
                    </p>
                  </EuiText>
                </EuiPanel>
                <EuiSpacer size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPanel paddingSize="s" hasShadow={false} grow={false}>
                  <EuiTitle size="xs">
                    <h4>
                      {i18n.translate(
                        'xpack.enterpriseSearch.selectConnector.h4.connectorClientsLabel',
                        { defaultMessage: 'Connector clients' }
                      )}
                    </h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiBadge iconSide="right" iconType="iInCircle">
                    {i18n.translate(
                      'xpack.enterpriseSearch.selectConnector.connectorClientBadgeLabel',
                      { defaultMessage: 'Connector client' }
                    )}
                  </EuiBadge>
                  <EuiSpacer size="s" />
                  <EuiText size="xs" grow={false}>
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.selectConnector.p.deployConnectorsOnYourLabel',
                        {
                          defaultMessage:
                            'Deploy connectors on your own infrastructure You can also customize existing Connector clients or build your own using our connector framework',
                        }
                      )}
                    </p>
                  </EuiText>
                </EuiPanel>
                <EuiSpacer size="s" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFieldSearch
            aria-label={i18n.translate(
              'xpack.enterpriseSearch.content.indices.selectConnector.search.ariaLabel',
              { defaultMessage: 'Search through connectors' }
            )}
            isClearable
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={i18n.translate(
              'xpack.enterpriseSearch.content.indices.selectConnector.searchPlaceholder',
              { defaultMessage: 'Search' }
            )}
            value={searchTerm}
            fullWidth
          />
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={3}>
            {filteredConnectors.map((connector) => (
              <EuiFlexItem key={connector.serviceType} grow>
                <ConnectorCheckable
                  isDisabled={(connector.platinumOnly && !(hasPlatinumLicense || isCloud)) ?? false}
                  iconType={connector.icon}
                  isBeta={connector.isBeta}
                  isTechPreview={Boolean(connector.isTechPreview)}
                  showNativeBadge={connector.isNative && hasNativeAccess}
                  name={connector.name}
                  serviceType={connector.serviceType}
                  onConnectorSelect={(queryParams?: string) => {
                    KibanaLogic.values.navigateToUrl(
                      `${generateEncodedPath(NEW_INDEX_METHOD_PATH, {
                        type: INGESTION_METHOD_IDS.CONNECTOR,
                      })}?service_type=${connector.serviceType}&${queryParams ?? ''}`
                    );
                  }}
                  documentationUrl={connector.docsUrl}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
          <EuiSpacer />
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem>
              <span>
                <EuiButton
                  data-telemetry-id="entSearchContent-connector-selectConnector-backButton"
                  color="primary"
                  onClick={() => KibanaLogic.values.navigateToUrl(NEW_INDEX_PATH)}
                >
                  {BACK_BUTTON_LABEL}
                </EuiButton>
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EnterpriseSearchContentPageTemplate>
  );
};
