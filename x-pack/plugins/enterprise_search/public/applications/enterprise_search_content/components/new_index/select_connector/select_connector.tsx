/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import { useLocation } from 'react-router-dom';

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
  EuiForm,
  EuiFormFieldset,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { INGESTION_METHOD_IDS } from '../../../../../../common/constants';

import {
  BACK_BUTTON_LABEL,
  CONTINUE_BUTTON_LABEL,
  LEARN_MORE_LINK,
} from '../../../../shared/constants';
import { docLinks } from '../../../../shared/doc_links';
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
  const { service_type: serviceType } = parseQueryParams(search);
  const [useNativeFilter, setUseNativeFilter] = useState(false);
  const [useNonGAFilter, setUseNonGAFilter] = useState(true);
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
      .filter((connector) =>
        useNonGAFilter ? true : !connector.isBeta && !connector.isTechPreview
      )
      .filter((connector) => (useNativeFilter ? connector.isNative : true))
      .filter((connector) =>
        searchTerm ? connector.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
      );
  }, [useNonGAFilter, useNativeFilter, searchTerm]);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(
    Array.isArray(serviceType) ? serviceType[0] : serviceType ?? null
  );

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
      <EuiForm
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          KibanaLogic.values.navigateToUrl(
            `${generateEncodedPath(NEW_INDEX_METHOD_PATH, {
              type: INGESTION_METHOD_IDS.CONNECTOR,
            })}?service_type=${selectedConnector}`
          );
        }}
      >
        <EuiFormFieldset
          legend={{
            children: (
              <EuiCallOut
                size="m"
                title={i18n.translate(
                  'xpack.enterpriseSearch.content.indices.selectConnector.callout.title',
                  { defaultMessage: 'Elastic connectors' }
                )}
                iconType="iInCircle"
              >
                <p>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.indices.selectConnector.description.textcloud"
                    defaultMessage="{native} are available directly within Elastic Cloud deployments. No additional infrastructure is required. Self-managed deployments must deploy the connector service to run native connectors. {learnMore}"
                    values={{
                      learnMore: (
                        <EuiLink target="_blank" href={docLinks.connectorsNative}>
                          {LEARN_MORE_LINK}
                        </EuiLink>
                      ),
                      native: (
                        <b>
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.indices.selectConnector.callout.description.native',
                            { defaultMessage: 'Native connectors' }
                          )}
                        </b>
                      ),
                    }}
                  />
                  <br />
                  <br />
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.indices.selectConnector.description.selfManaged.text"
                    defaultMessage="For advanced use cases, deploy {connectorsClient} on your own infrastructure. Customize existing connectors, or build your own using our connector framework. {learnMore}"
                    values={{
                      connectorsClient: (
                        <b>
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.indices.selectConnector.callout.description.connectorsClient',
                            { defaultMessage: 'connector clients' }
                          )}
                        </b>
                      ),
                      learnMore: (
                        <EuiLink target="_blank" href={docLinks.connectorsClients}>
                          {LEARN_MORE_LINK}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiCallOut>
            ),
          }}
        >
          <EuiFlexGroup>
            {/* Only facet is for native connectors, so only show facets if we can show native connectors */}
            {hasNativeAccess && (
              <EuiFlexItem grow={false}>
                <EuiFacetGroup>
                  <EuiFacetButton
                    quantity={CONNECTORS.length}
                    isSelected={!useNativeFilter}
                    onClick={() => setUseNativeFilter(!useNativeFilter)}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.allConnectorsLabel',
                      { defaultMessage: 'All connectors' }
                    )}
                  </EuiFacetButton>
                  <EuiFacetButton
                    quantity={CONNECTORS.filter((connector) => connector.isNative).length}
                    isSelected={useNativeFilter}
                    onClick={() => setUseNativeFilter(!useNativeFilter)}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.nativeLabel',
                      { defaultMessage: 'Native connectors' }
                    )}
                  </EuiFacetButton>
                </EuiFacetGroup>
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
              />
              <EuiSpacer size="s" />
              <EuiSwitch
                checked={useNonGAFilter}
                label={i18n.translate(
                  'xpack.enterpriseSearch.content.indices.selectConnector.showNonGALabel',
                  { defaultMessage: 'Display Beta and Tech Preview connectors' }
                )}
                onChange={(e) => setUseNonGAFilter(e.target.checked)}
              />
              <EuiSpacer size="s" />
              <EuiFlexGrid columns={3}>
                {filteredConnectors.map((connector) => (
                  <EuiFlexItem key={connector.serviceType} grow>
                    <ConnectorCheckable
                      disabled={connector.platinumOnly && !hasPlatinumLicense}
                      icon={connector.icon}
                      isBeta={connector.isBeta}
                      isTechPreview={Boolean(connector.isTechPreview)}
                      showNativeBadge={connector.isNative && hasNativeAccess}
                      name={connector.name}
                      serviceType={connector.serviceType}
                      onChange={() => {
                        setSelectedConnector(connector.serviceType);
                      }}
                      documentationUrl={connector.docsUrl}
                      checked={selectedConnector === connector.serviceType}
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
                <EuiFlexItem grow={false}>
                  <span>
                    <EuiButton
                      data-test-subj="entSearchContent-connector-selectConnector-selectAndConfigure"
                      data-telemetry-id="entSearchContent-connector-selectConnector-selectAndConfigure"
                      disabled={selectedConnector === null}
                      fill
                      color="primary"
                      type="submit"
                    >
                      {CONTINUE_BUTTON_LABEL}
                    </EuiButton>
                  </span>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormFieldset>
      </EuiForm>
    </EnterpriseSearchContentPageTemplate>
  );
};
