/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useLocation } from 'react-router-dom';

import { useValues } from 'kea';

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ConnectorDefinition } from '@kbn/search-connectors-plugin/public';

import {
  CONNECTOR_CLIENTS_TYPE,
  CONNECTOR_NATIVE_TYPE,
  INGESTION_METHOD_IDS,
} from '../../../../../common/constants';
import { KibanaLogic } from '../../../shared/kibana';
import { parseQueryParams } from '../../../shared/query_params';

import { connectorsBreadcrumbs, crawlersBreadcrumbs } from '../connectors/connectors';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';
import { baseBreadcrumbs } from '../search_indices';

import { MethodApi } from './method_api/method_api';
import { MethodConnector } from './method_connector/method_connector';
import { MethodCrawler } from './method_crawler/method_crawler';
import { getIngestionMethodIconType } from './utils';

function getTitle(
  method: string,
  serviceType: string,
  connectorTypes: ConnectorDefinition[]
): string {
  switch (method) {
    case INGESTION_METHOD_IDS.API:
      return i18n.translate('xpack.enterpriseSearch.content.new_index.apiTitle', {
        defaultMessage: 'New search index',
      });
    case INGESTION_METHOD_IDS.CONNECTOR: {
      const connector =
        Boolean(serviceType) && connectorTypes.find((item) => item.serviceType === serviceType);
      return connector
        ? i18n.translate('xpack.enterpriseSearch.content.new_index.connectorTitleWithServiceType', {
            defaultMessage: 'New {name} connector',
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

const parseIsNativeParam = (queryString: string | string[] | null): boolean | undefined => {
  const parsedStr = Array.isArray(queryString) ? queryString[0] : queryString;
  if (parsedStr === CONNECTOR_NATIVE_TYPE) return true;
  if (parsedStr === CONNECTOR_CLIENTS_TYPE) return false;
  return undefined;
};

const getBreadcrumb = (
  method: string,
  serviceType: string,
  connectorTypes: ConnectorDefinition[]
): string[] => {
  switch (method) {
    case INGESTION_METHOD_IDS.CONNECTOR:
      const connector =
        Boolean(serviceType) && connectorTypes.find((item) => item.serviceType === serviceType);

      const thisConnectorBreadcrumb = connector
        ? i18n.translate(
            'xpack.enterpriseSearch.content.new_connector_with_service_type.breadcrumbs',
            {
              defaultMessage: `New {name} connector`,
              values: {
                name: connector.name,
              },
            }
          )
        : i18n.translate('xpack.enterpriseSearch.content.new_connector.breadcrumbs', {
            defaultMessage: `New connector`,
          });

      return [...connectorsBreadcrumbs, thisConnectorBreadcrumb];
    case INGESTION_METHOD_IDS.CRAWLER:
      return [
        ...crawlersBreadcrumbs,
        i18n.translate('xpack.enterpriseSearch.content.new_web_crawler.breadcrumbs', {
          defaultMessage: 'New web crawler',
        }),
      ];
    default:
      return [
        ...baseBreadcrumbs,
        i18n.translate('xpack.enterpriseSearch.content.new_index.breadcrumbs', {
          defaultMessage: 'New search index',
        }),
      ];
  }
};

const getConnectorModeBadge = (isNative?: boolean) => {
  if (isNative) {
    return (
      <EuiBadge iconSide="right">
        <FormattedMessage
          id="xpack.enterpriseSearch.getConnectorTypeBadge.nativeBadgeLabel"
          defaultMessage="Native connector"
        />
      </EuiBadge>
    );
  }
  if (!isNative) {
    return (
      <EuiBadge iconSide="right">
        {i18n.translate('xpack.enterpriseSearch.getConnectorTypeBadge.connectorClientBadgeLabel', {
          defaultMessage: 'Connector client',
        })}
      </EuiBadge>
    );
  }
  return undefined;
};
export interface NewSearchIndexPageProps {
  type: string;
}
export const NewSearchIndexPage: React.FC<NewSearchIndexPageProps> = ({ type }) => {
  const { connectorTypes } = useValues(KibanaLogic);
  const { search } = useLocation();
  const { service_type: inputServiceType, connector_type: inputConnectorType } =
    parseQueryParams(search);
  const serviceType = Array.isArray(inputServiceType)
    ? inputServiceType[0]
    : inputServiceType || '';

  const isNative = parseIsNativeParam(inputConnectorType);

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={getBreadcrumb(type, serviceType, connectorTypes)}
      pageViewTelemetry="New Index"
      isLoading={false}
      pageHeader={{
        description: getDescription(type),
        pageTitle: (
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={getIngestionMethodIconType(type)} size="xxl" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{getTitle(type, serviceType, connectorTypes)}</EuiFlexItem>
            {type === INGESTION_METHOD_IDS.CONNECTOR && (
              <EuiFlexItem grow={false}>{getConnectorModeBadge(isNative)}</EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      }}
    >
      {
        <>
          {type === INGESTION_METHOD_IDS.CRAWLER && <MethodCrawler />}
          {type === INGESTION_METHOD_IDS.API && <MethodApi />}
          {type === INGESTION_METHOD_IDS.CONNECTOR && (
            <MethodConnector serviceType={serviceType} isNative={isNative} />
          )}
        </>
      }
    </EnterpriseSearchContentPageTemplate>
  );
};
