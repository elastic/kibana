/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { generatePath } from 'react-router-dom';

import { useValues } from 'kea';

import { EuiButton, EuiCard, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  ENTERPRISE_SEARCH_CONTENT_PLUGIN,
  INGESTION_METHOD_IDS,
} from '../../../../../common/constants';

import apiLogo from '../../../../assets/images/api_cloud.svg';
import connectorLogo from '../../../../assets/images/search_connector.svg';
import crawlerLogo from '../../../../assets/images/search_crawler.svg';

import {
  NEW_API_PATH,
  NEW_INDEX_METHOD_PATH,
  NEW_INDEX_SELECT_CONNECTOR_PATH,
} from '../../../enterprise_search_content/routes';
import { HttpLogic } from '../../../shared/http/http_logic';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiButtonTo, EuiLinkTo } from '../../../shared/react_router_helpers';

const START_LABEL = i18n.translate('xpack.enterpriseSearch.ingestSelector.startButton', {
  defaultMessage: 'Start',
});

export const IngestionSelector: React.FC = () => {
  const { config, productFeatures } = useValues(KibanaLogic);
  const { errorConnectingMessage } = useValues(HttpLogic);
  const crawlerDisabled = Boolean(errorConnectingMessage || !config.host);
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiCard
          hasBorder
          icon={<EuiIcon type={apiLogo} size="xxl" />}
          textAlign="left"
          title={i18n.translate('xpack.enterpriseSearch.ingestSelector.method.api', {
            defaultMessage: 'API',
          })}
          description={i18n.translate(
            'xpack.enterpriseSearch.ingestSelector.method.api.description',
            {
              defaultMessage:
                'Add documents programmatically by connecting with the API using your preferred language client.',
            }
          )}
          footer={
            <EuiLinkTo
              to={generatePath(ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + NEW_API_PATH)}
              shouldNotCreateHref
            >
              <EuiButton fullWidth>{START_LABEL}</EuiButton>
            </EuiLinkTo>
          }
        />
      </EuiFlexItem>
      {productFeatures.hasConnectors && (
        <EuiFlexItem>
          <EuiCard
            hasBorder
            icon={<EuiIcon type={connectorLogo} size="xxl" />}
            textAlign="left"
            title={i18n.translate('xpack.enterpriseSearch.ingestSelector.method.connectors', {
              defaultMessage: 'Connectors',
            })}
            description={i18n.translate(
              'xpack.enterpriseSearch.ingestSelector.method.connectors.description',
              {
                defaultMessage:
                  'Extract, transform, index and sync data from a third-party data source.',
              }
            )}
            footer={
              <EuiLinkTo
                to={generatePath(
                  ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + NEW_INDEX_SELECT_CONNECTOR_PATH
                )}
                shouldNotCreateHref
              >
                <EuiButton fullWidth>{START_LABEL}</EuiButton>
              </EuiLinkTo>
            }
          />
        </EuiFlexItem>
      )}
      {productFeatures.hasWebCrawler && (
        <EuiFlexItem>
          <EuiCard
            hasBorder
            isDisabled={crawlerDisabled}
            icon={<EuiIcon type={crawlerLogo} size="xxl" />}
            textAlign="left"
            title={i18n.translate('xpack.enterpriseSearch.ingestSelector.method.crawler', {
              defaultMessage: 'Web Crawler',
            })}
            description={i18n.translate(
              'xpack.enterpriseSearch.ingestSelector.method.crawler.description',
              {
                defaultMessage:
                  'Discover, extract, and index searchable content from websites and knowledge bases.',
              }
            )}
            footer={
              <EuiButtonTo
                fullWidth
                isDisabled={crawlerDisabled}
                to={generatePath(ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + NEW_INDEX_METHOD_PATH, {
                  type: INGESTION_METHOD_IDS.CRAWLER,
                })}
                shouldNotCreateHref
              >
                {START_LABEL}
              </EuiButtonTo>
            }
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
