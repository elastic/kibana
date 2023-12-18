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

import { INGESTION_METHOD_IDS } from '../../../../../common/constants';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { handlePageChange } from '../../../shared/table_pagination';
import {
  NEW_INDEX_METHOD_PATH,
  NEW_INDEX_SELECT_CONNECTOR_CLIENTS_PATH,
  NEW_INDEX_SELECT_CONNECTOR_NATIVE_PATH,
  NEW_INDEX_SELECT_CONNECTOR_PATH,
} from '../../routes';
import { EnterpriseSearchContentPageTemplate } from '../layout';
import { SelectConnector } from '../new_index/select_connector/select_connector';

import { ConnectorStats } from './connector_stats';
import { ConnectorsLogic } from './connectors_logic';
import { ConnectorsTable } from './connectors_table';
import { CrawlerEmptyState } from './crawler_empty_state';

export const baseBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.content.connectors.breadcrumb', {
    defaultMessage: 'Connectors',
  }),
];

export interface ConnectorsProps {
  isCrawler: boolean;
}
export const Connectors: React.FC<ConnectorsProps> = ({ isCrawler }) => {
  const { fetchConnectors, onPaginate, setIsFirstRequest } = useActions(ConnectorsLogic);
  const { data, isLoading, searchParams, isEmpty, connectors } = useValues(ConnectorsLogic);
  const [searchQuery, setSearchValue] = useState('');

  useEffect(() => {
    setIsFirstRequest();
  }, [isCrawler]);

  useEffect(() => {
    fetchConnectors({ ...searchParams, searchQuery, fetchCrawlersOnly: isCrawler });
  }, [searchParams.from, searchParams.size, searchQuery, isCrawler]);

  return !isLoading && isEmpty && !isCrawler ? (
    <SelectConnector />
  ) : (
    <EnterpriseSearchContentPageTemplate
      pageChrome={baseBreadcrumbs}
      pageViewTelemetry={!isCrawler ? 'Connectors' : 'Web Crawlers'}
      isLoading={isLoading}
      pageHeader={{
        pageTitle: !isCrawler
          ? i18n.translate('xpack.enterpriseSearch.connectors.title', {
              defaultMessage: 'Elasticsearch connectors',
            })
          : i18n.translate('xpack.enterpriseSearch.crawlers.title', {
              defaultMessage: 'Elasticsearch web crawlers',
            }),
        rightSideGroupProps: {
          gutterSize: 's',
        },
        rightSideItems: isLoading
          ? []
          : !isCrawler
          ? [
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
                  KibanaLogic.values.navigateToUrl(NEW_INDEX_SELECT_CONNECTOR_NATIVE_PATH);
                }}
              >
                {i18n.translate('xpack.enterpriseSearch.connectors.newNativeConnectorButtonLabel', {
                  defaultMessage: 'New Native Connector',
                })}
              </EuiButton>,
              <EuiButton
                key="newConnectorClient"
                onClick={() => {
                  KibanaLogic.values.navigateToUrl(NEW_INDEX_SELECT_CONNECTOR_CLIENTS_PATH);
                }}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.connectors.newConnectorsClientButtonLabel',
                  { defaultMessage: 'New Connector Client' }
                )}
              </EuiButton>,
            ]
          : [
              <EuiButton
                key="newCrawler"
                color="primary"
                iconType="plusInCircle"
                fill
                onClick={() => {
                  KibanaLogic.values.navigateToUrl(
                    generateEncodedPath(NEW_INDEX_METHOD_PATH, {
                      type: INGESTION_METHOD_IDS.CRAWLER,
                    })
                  );
                }}
              >
                {i18n.translate('xpack.enterpriseSearch.connectors.newCrawlerButtonLabel', {
                  defaultMessage: 'New web crawler',
                })}
              </EuiButton>,
            ],
      }}
    >
      <ConnectorStats isCrawler={isCrawler} />
      <EuiSpacer />

      <EuiFlexGroup direction="column">
        {isEmpty && isCrawler ? (
          <CrawlerEmptyState />
        ) : (
          <>
            <EuiFlexItem>
              <EuiTitle>
                <h2>
                  {!isCrawler ? (
                    <FormattedMessage
                      id="xpack.enterpriseSearch.connectorsTable.h2.availableConnectorsLabel"
                      defaultMessage="Available connectors"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.enterpriseSearch.connectorsTable.h2.availableCrawlersLabel"
                      defaultMessage="Available web crawlers"
                    />
                  )}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSearchBar
                query={searchQuery}
                box={{
                  incremental: true,
                  placeholder: !isCrawler
                    ? i18n.translate(
                        'xpack.enterpriseSearch.connectorsTable.euiSearchBar.filterConnectorsPlaceholder',
                        { defaultMessage: 'Filter connectors' }
                      )
                    : i18n.translate(
                        'xpack.enterpriseSearch.connectorsTable.euiSearchBar.filterCrawlersPlaceholder',
                        { defaultMessage: 'Filter web crawlers' }
                      ),
                }}
                aria-label={
                  !isCrawler
                    ? i18n.translate(
                        'xpack.enterpriseSearch.connectorsTable.euiSearchBar.filterConnectorsLabel',
                        { defaultMessage: 'Filter connectors' }
                      )
                    : i18n.translate(
                        'xpack.enterpriseSearch.connectorsTable.euiSearchBar.filterCrawlersLabel',
                        { defaultMessage: 'Filter web crawlers' }
                      )
                }
                onChange={(event) => setSearchValue(event.queryText)}
              />
            </EuiFlexItem>
            <ConnectorsTable
              items={connectors || []}
              meta={data?.meta}
              onChange={handlePageChange(onPaginate)}
            />
          </>
        )}
      </EuiFlexGroup>
    </EnterpriseSearchContentPageTemplate>
  );
};
