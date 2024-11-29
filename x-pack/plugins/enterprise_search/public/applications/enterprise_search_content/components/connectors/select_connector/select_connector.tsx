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
  EuiButton,
  EuiCallOut,
  EuiFacetButton,
  EuiFacetGroup,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CONNECTOR_CLIENTS_TYPE, CONNECTOR_NATIVE_TYPE } from '../../../../../../common/constants';

import connectorLogo from '../../../../../assets/images/connector_logo_network_drive_version.svg';

import { KibanaLogic } from '../../../../shared/kibana';
import { LicensingLogic } from '../../../../shared/licensing';
import { parseQueryParams } from '../../../../shared/query_params';

import { NEW_CONNECTOR_PATH } from '../../../routes';
import { EnterpriseSearchContentPageTemplate } from '../../layout';

import { connectorsBreadcrumbs } from '../connectors';

import { ConnectorCheckable } from './connector_checkable';
import { ConnectorDescriptionBadge } from './connector_description_badge_popout';

export type ConnectorFilter = typeof CONNECTOR_NATIVE_TYPE | typeof CONNECTOR_CLIENTS_TYPE;

export const parseConnectorFilter = (filter: string | string[] | null): ConnectorFilter | null => {
  const temp = Array.isArray(filter) ? filter[0] : filter ?? null;
  if (!temp) return null;
  if (temp === CONNECTOR_CLIENTS_TYPE) {
    return CONNECTOR_CLIENTS_TYPE;
  }
  if (temp === CONNECTOR_NATIVE_TYPE) {
    return CONNECTOR_NATIVE_TYPE;
  }
  return null;
};

export const SelectConnector: React.FC = () => {
  const { search } = useLocation();
  const { connectorTypes, isCloud } = useValues(KibanaLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const hasNativeAccess = isCloud;
  const { filter } = parseQueryParams(search);
  const [selectedConnectorFilter, setSelectedConnectorFilter] = useState<ConnectorFilter | null>(
    parseConnectorFilter(filter)
  );
  const useNativeFilter = selectedConnectorFilter === CONNECTOR_NATIVE_TYPE;
  const useClientsFilter = selectedConnectorFilter === CONNECTOR_CLIENTS_TYPE;
  const [showTechPreview, setShowTechPreview] = useState(true);
  const [showBeta, setShowBeta] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const filteredConnectors = useMemo(() => {
    const nativeConnectors = hasNativeAccess
      ? connectorTypes
          .filter((connector) => connector.isNative)
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];
    const nonNativeConnectors = hasNativeAccess
      ? connectorTypes
          .filter((connector) => !connector.isNative)
          .sort((a, b) => a.name.localeCompare(b.name))
      : connectorTypes.sort((a, b) => a.name.localeCompare(b.name));
    const connectors =
      !hasNativeAccess || useClientsFilter
        ? connectorTypes.sort((a, b) => a.name.localeCompare(b.name))
        : [...nativeConnectors, ...nonNativeConnectors];

    return connectors
      .filter((connector) => (showBeta ? true : !connector.isBeta))
      .filter((connector) => (showTechPreview ? true : !connector.isTechPreview))
      .filter((connector) => (useNativeFilter ? connector.isNative : true))
      .filter((connector) =>
        searchTerm ? connector.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
      );
  }, [hasNativeAccess, useClientsFilter, showBeta, showTechPreview, useNativeFilter, searchTerm]);
  const { euiTheme } = useEuiTheme();

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[
        ...connectorsBreadcrumbs,
        i18n.translate('xpack.enterpriseSearch.content.indices.selectConnector.breadcrumb', {
          defaultMessage: 'Select connector',
        }),
      ]}
      pageViewTelemetry="select_connector"
      isLoading={false}
      pageHeader={{
        description: i18n.translate(
          'xpack.enterpriseSearch.content.indices.selectConnector.description',
          {
            defaultMessage:
              "Select which third-party data source you'd like to sync to Elastic. All data sources are supported by self-managed connectors. Check the availability for Elastic managed connectors by using the filters.",
          }
        ),
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.indices.selectConnector.title', {
          defaultMessage: 'Select a connector',
        }),
      }}
    >
      <EuiFlexGroup>
        <EuiFlexItem
          grow={false}
          css={css`
            max-width: calc(${euiTheme.size.xxl} * 5);
          `}
        >
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiFacetGroup>
                {hasNativeAccess && (
                  <EuiFacetButton
                    quantity={connectorTypes.length}
                    isSelected={!useNativeFilter && !useClientsFilter}
                    onClick={() => setSelectedConnectorFilter(null)}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.allConnectorsLabel',
                      { defaultMessage: 'All connectors' }
                    )}
                  </EuiFacetButton>
                )}

                {hasNativeAccess && (
                  <EuiFacetButton
                    key="native"
                    quantity={connectorTypes.filter((connector) => connector.isNative).length}
                    isSelected={useNativeFilter}
                    onClick={() =>
                      setSelectedConnectorFilter(!useNativeFilter ? CONNECTOR_NATIVE_TYPE : null)
                    }
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.nativeLabel',
                      {
                        defaultMessage: 'Elastic managed',
                      }
                    )}
                  </EuiFacetButton>
                )}

                <EuiFacetButton
                  quantity={connectorTypes.length}
                  isSelected={(!hasNativeAccess && !useNativeFilter) || useClientsFilter}
                  onClick={() =>
                    setSelectedConnectorFilter(!useClientsFilter ? CONNECTOR_CLIENTS_TYPE : null)
                  }
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.indices.selectConnector.connectorClients',
                    {
                      defaultMessage: 'Self-managed',
                    }
                  )}
                </EuiFacetButton>
                {!hasNativeAccess && (
                  <EuiFacetButton
                    key="native"
                    quantity={connectorTypes.filter((connector) => connector.isNative).length}
                    isSelected={useNativeFilter}
                    onClick={() =>
                      setSelectedConnectorFilter(!useNativeFilter ? CONNECTOR_NATIVE_TYPE : null)
                    }
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.nativeLabel',
                      {
                        defaultMessage: 'Elastic managed',
                      }
                    )}
                  </EuiFacetButton>
                )}
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
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="logoCloud" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h4>
                        {i18n.translate(
                          'xpack.enterpriseSearch.selectConnector.nativeConnectorsTitleLabel',
                          { defaultMessage: 'Elastic managed connectors' }
                        )}
                      </h4>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <ConnectorDescriptionBadge isNative />
                <EuiSpacer size="s" />
                <EuiText size="xs" grow={false}>
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.selectConnector.p.areAvailableDirectlyWithinLabel',
                      {
                        defaultMessage:
                          'Available directly within Elastic Cloud deployments. No additional infrastructure is required. You can also convert Elastic managed connectors to self-managed connectors.',
                      }
                    )}
                  </p>
                </EuiText>
              </EuiPanel>
              <EuiSpacer size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPanel paddingSize="s" hasShadow={false} grow={false}>
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={connectorLogo} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h4>
                        {i18n.translate(
                          'xpack.enterpriseSearch.selectConnector.h4.connectorClientsLabel',
                          { defaultMessage: 'Self-managed connectors' }
                        )}
                      </h4>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <ConnectorDescriptionBadge isNative={false} />
                <EuiSpacer size="s" />
                <EuiText size="xs" grow={false}>
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.selectConnector.p.deployConnectorsOnYourLabel',
                      {
                        defaultMessage:
                          'Deploy connectors on your own infrastructure. You can also customize existing self-managed connectors, or build your own using our connector framework.',
                      }
                    )}
                  </p>
                </EuiText>
              </EuiPanel>
              <EuiSpacer size="s" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldSearch
            data-test-subj="entSearchContent-connectors-selectConnector-searchInput"
            data-telemetry-id="entSearchContent-connectors-selectConnector-searchInput"
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
              <EuiFlexItem key={connector.name} grow>
                <ConnectorCheckable
                  showNativePopover={(!hasNativeAccess && useNativeFilter) ?? false}
                  showLicensePopover={connector.platinumOnly && !hasPlatinumLicense && !isCloud}
                  isDisabled={(!hasNativeAccess && useNativeFilter) ?? false}
                  iconType={connector.iconPath}
                  isBeta={connector.isBeta}
                  isTechPreview={Boolean(connector.isTechPreview)}
                  showNativeBadge={
                    (hasNativeAccess && connector.isNative && !useClientsFilter) ||
                    (!hasNativeAccess && useNativeFilter)
                  }
                  name={connector.name}
                  serviceType={connector.serviceType}
                  onConnectorSelect={(isNative?: boolean) => {
                    const queryParam = new URLSearchParams();
                    queryParam.append('service_type', connector.serviceType);
                    if (isNative !== undefined) {
                      queryParam.append(
                        'connector_type',
                        isNative && !useClientsFilter
                          ? CONNECTOR_NATIVE_TYPE
                          : CONNECTOR_CLIENTS_TYPE
                      );
                    }
                    KibanaLogic.values.navigateToUrl(
                      `${NEW_CONNECTOR_PATH}?${queryParam.toString()}`
                    );
                  }}
                  documentationUrl={connector.docsUrl}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
          {!hasNativeAccess && useNativeFilter && (
            <>
              <EuiSpacer />
              <EuiCallOut
                size="m"
                title={i18n.translate(
                  'xpack.enterpriseSearch.content.indices.selectConnector.cloudCallout.title',
                  {
                    defaultMessage: 'Elastic Cloud',
                  }
                )}
                iconType="iInCircle"
              >
                <p>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.indices.selectConnector.cloudCallout.description"
                    defaultMessage="Elastic managed connectors are hosted on Elastic Cloud. Get started with a free 14-day trial."
                  />
                </p>
                <EuiButton
                  data-test-subj="entSearchContent-connectors-selectConnector-cloudCallout-trialButton"
                  data-telemetry-id="entSearchContent-connectors-selectConnector-cloudCallout-trialButton"
                  color="primary"
                  fill
                  href="https://www.elastic.co/cloud/cloud-trial-overview"
                  iconType="popout"
                  iconSide="right"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.indices.selectConnector.cloudCallout.trialLink"
                    defaultMessage="Elastic Cloud Trial"
                  />
                </EuiButton>
              </EuiCallOut>
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EnterpriseSearchContentPageTemplate>
  );
};
