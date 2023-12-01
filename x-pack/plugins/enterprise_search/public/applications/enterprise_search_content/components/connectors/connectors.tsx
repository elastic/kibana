/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSearchBar,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { KibanaLogic } from '../../../shared/kibana';
import { handlePageChange } from '../../../shared/table_pagination';
import { NEW_INDEX_SELECT_CONNECTOR_PATH } from '../../routes';
import { EnterpriseSearchContentPageTemplate } from '../layout';
import { SelectConnector } from '../new_index/select_connector/select_connector';

import { ConnectorStats } from './connector_stats';
import { ConnectorsLogic } from './connectors_logic';
import { ConnectorsTable } from './connectors_table';

export const baseBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.content.connectors.breadcrumb', {
    defaultMessage: 'Connectors',
  }),
];
export const Connectors: React.FC = () => {
  const { fetchConnectors, onPaginate, setIsFirstRequest } = useActions(ConnectorsLogic);
  const { data, isLoading, searchParams, isEmpty, connectors } = useValues(ConnectorsLogic);
  const [searchQuery, setSearchValue] = useState('');

  useEffect(() => {
    setIsFirstRequest();
  }, []);

  useEffect(() => {
    fetchConnectors({ ...searchParams, searchQuery });
  }, [searchParams.from, searchParams.size, searchQuery]);

  return (
    <>
      {!isLoading && isEmpty ? (
        <SelectConnector />
      ) : (
        <EnterpriseSearchContentPageTemplate
          pageChrome={baseBreadcrumbs}
          pageViewTelemetry="Connectors"
          isLoading={isLoading}
          pageHeader={{
            pageTitle: 'Elasticsearch connectors',
            rightSideGroupProps: {
              gutterSize: 's',
            },
            rightSideItems: isLoading
              ? []
              : [
                  <EuiButton
                    key="newConnector"
                    color="primary"
                    iconType="plusInCircle"
                    fill
                    onClick={() => {
                      KibanaLogic.values.navigateToUrl(NEW_INDEX_SELECT_CONNECTOR_PATH);
                    }}
                  >
                    <FormattedMessage
                      id="xpack.enterpriseSearch.connectors.newConnectorButtonLabel"
                      defaultMessage="New Connector"
                    />
                  </EuiButton>,
                  <EuiButton
                    key="newConnectorNative"
                    onClick={() => {
                      KibanaLogic.values.navigateToUrl(
                        NEW_INDEX_SELECT_CONNECTOR_PATH + '?filter=native'
                      );
                    }}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.connectors.newNativeConnectorButtonLabel',
                      { defaultMessage: 'New Native Connector' }
                    )}
                  </EuiButton>,
                  <EuiButton
                    key="newConnectorClient"
                    onClick={() => {
                      KibanaLogic.values.navigateToUrl(
                        NEW_INDEX_SELECT_CONNECTOR_PATH + '?filter=connector_client'
                      );
                    }}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.connectors.newConnectorsClientButtonLabel',
                      { defaultMessage: 'New Connectors Client' }
                    )}
                  </EuiButton>,
                ],
          }}
        >
          <ConnectorStats />
          <EuiSpacer />

          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiTitle>
                <h2>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.connectorsTable.h2.availableConnectorsLabel"
                    defaultMessage="Available Connectors"
                  />
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSearchBar
                query={searchQuery}
                box={{ incremental: true, placeholder: 'Filter Connectors' }}
                aria-label={i18n.translate(
                  'xpack.enterpriseSearch.connectorsTable.euiSearchBar.filterConnectorsLabel',
                  { defaultMessage: 'Filter Connectors' }
                )}
                onChange={(event) => setSearchValue(event.queryText)}
              />
            </EuiFlexItem>
            <ConnectorsTable
              items={connectors || []}
              meta={data?.meta}
              onChange={handlePageChange(onPaginate)}
            />
          </EuiFlexGroup>
        </EnterpriseSearchContentPageTemplate>
      )}
    </>
  );
};
