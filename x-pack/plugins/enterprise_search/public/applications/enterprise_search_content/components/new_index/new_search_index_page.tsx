/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useLocation, useParams } from 'react-router-dom';

import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { INGESTION_METHOD_IDS } from '../../../../../common/constants';
import { parseQueryParams } from '../../../shared/query_params';

import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';
import { CONNECTORS } from '../search_index/connector/constants';
import { baseBreadcrumbs } from '../search_indices';

import { MethodApi } from './method_api/method_api';
import { MethodConnector } from './method_connector/method_connector';
import { MethodCrawler } from './method_crawler/method_crawler';
import { getIngestionMethodIconType } from './utils';

function getTitle(method: string, serviceType: string): string {
  switch (method) {
    case INGESTION_METHOD_IDS.API:
      return i18n.translate('xpack.enterpriseSearch.content.new_index.apiTitle', {
        defaultMessage: 'New search index',
      });
    case INGESTION_METHOD_IDS.CONNECTOR: {
      const connector =
        Boolean(serviceType) && CONNECTORS.find((item) => item.serviceType === serviceType);
      return connector
        ? i18n.translate('xpack.enterpriseSearch.content.new_index.connectorTitleWithServiceType', {
            defaultMessage: 'New {name} search index',
            values: {
              name: connector.name,
            },
          })
        : i18n.translate('xpack.enterpriseSearch.content.new_index.connectorTitle', {
            defaultMessage: 'New connector search index',
          });
    }
    case INGESTION_METHOD_IDS.CRAWLER:
      return i18n.translate('xpack.enterpriseSearch.content.new_index.crawlerTitle', {
        defaultMessage: 'Web crawler search index',
      });
    default:
      return i18n.translate('xpack.enterpriseSearch.content.new_index.genericTitle', {
        defaultMessage: 'New search index',
      });
  }
}

function getDescription(method: string): string {
  switch (method) {
    case INGESTION_METHOD_IDS.API:
      return i18n.translate('xpack.enterpriseSearch.content.new_index.apiDescription', {
        defaultMessage:
          'Use the API to programatically add documents to an Elasticsearch index. Start by creating your index.',
      });
    case INGESTION_METHOD_IDS.CONNECTOR: {
      return i18n.translate(
        'xpack.enterpriseSearch.content.new_index.connectorDescriptionWithServiceType',
        {
          defaultMessage:
            'Use a connector to sync, extract, transform and index data from your data source. Connectors are Elastic integrations that write directly to Elasticsearch indices.',
        }
      );
    }
    case INGESTION_METHOD_IDS.CRAWLER:
      return i18n.translate('xpack.enterpriseSearch.content.new_index.crawlerDescription', {
        defaultMessage:
          'Use the web crawler to programmatically discover, extract, and index searchable content from websites and knowledge bases.',
      });
    default:
      return i18n.translate('xpack.enterpriseSearch.content.new_index.defaultDescription', {
        defaultMessage: 'A search index stores your data.',
      });
  }
}

export const NewSearchIndexPage: React.FC = () => {
  const type = decodeURIComponent(useParams<{ type: string }>().type);
  const { search } = useLocation();
  const { service_type: inputServiceType } = parseQueryParams(search);
  const serviceType = Array.isArray(inputServiceType)
    ? inputServiceType[0]
    : inputServiceType || '';

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...baseBreadcrumbs, 'New search index']}
      pageViewTelemetry="New Index"
      isLoading={false}
      pageHeader={{
        description: getDescription(type),
        pageTitle: (
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiIcon type={getIngestionMethodIconType(type)} size="xxl" />
            </EuiFlexItem>
            <EuiFlexItem>{getTitle(type, serviceType)}</EuiFlexItem>
          </EuiFlexGroup>
        ),
      }}
    >
      {
        <>
          {type === INGESTION_METHOD_IDS.CRAWLER && <MethodCrawler />}
          {type === INGESTION_METHOD_IDS.API && <MethodApi />}
          {type === INGESTION_METHOD_IDS.CONNECTOR && <MethodConnector serviceType={serviceType} />}
        </>
      }
    </EnterpriseSearchContentPageTemplate>
  );
};
