/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { generatePath } from 'react-router-dom';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  ENTERPRISE_SEARCH_CONTENT_PLUGIN,
  ENTERPRISE_SEARCH_ELASTICSEARCH_URL,
} from '../../../../../common/constants';

import apiLogo from '../../../../assets/images/api_image.png';
import fileUploadLogo from '../../../../assets/images/file_upload_logo.svg';
import sampleDataLogo from '../../../../assets/images/sample_data_logo.svg';
import connectorLogo from '../../../../assets/images/search_connector.svg';
import crawlerLogo from '../../../../assets/images/search_crawler.svg';
import languageClientsLogo from '../../../../assets/images/search_language_clients.svg';

import { IngestionCard } from '../../../enterprise_search_content/components/shared/ingestion_card/ingestion_card';
import {
  NEW_API_PATH,
  NEW_CRAWLER_PATH,
  NEW_INDEX_SELECT_CONNECTOR_PATH,
} from '../../../enterprise_search_content/routes';
import { HttpLogic } from '../../../shared/http/http_logic';

import { ConnectorIcon } from '../../../shared/icons/connector';
import { CrawlerIcon } from '../../../shared/icons/crawler';
import { KibanaLogic } from '../../../shared/kibana';

export const IngestionSelector: React.FC = () => {
  const {
    application: { navigateToApp },
    config,
    productFeatures,
  } = useValues(KibanaLogic);
  const { errorConnectingMessage } = useValues(HttpLogic);
  const crawlerDisabled = Boolean(errorConnectingMessage || !config.host);
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <IngestionCard
            logo={apiLogo}
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
            href={generatePath(ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + NEW_API_PATH)}
            buttonIcon="console"
            buttonLabel={i18n.translate(
              'xpack.enterpriseSearch.ingestSelector.method.apiButtonLabel',
              {
                defaultMessage: 'Create API index',
              }
            )}
          />
        </EuiFlexItem>
        {productFeatures.hasWebCrawler && (
          <EuiFlexItem>
            <IngestionCard
              buttonLabel={i18n.translate(
                'xpack.enterpriseSearch.ingestSelector.method.crawlerButtonLabel',
                {
                  defaultMessage: 'Crawl URL',
                }
              )}
              buttonIcon={CrawlerIcon}
              description={i18n.translate(
                'xpack.enterpriseSearch.ingestSelector.method.crawler.description',
                {
                  defaultMessage:
                    'Discover, extract, and index searchable content from websites and knowledge bases.',
                }
              )}
              href={generatePath(ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + NEW_CRAWLER_PATH)}
              isDisabled={crawlerDisabled}
              logo={crawlerLogo}
              title={i18n.translate('xpack.enterpriseSearch.ingestSelector.method.crawler', {
                defaultMessage: 'Web Crawler',
              })}
            />
          </EuiFlexItem>
        )}
        {productFeatures.hasConnectors && (
          <EuiFlexItem>
            <IngestionCard
              buttonLabel={i18n.translate(
                'xpack.enterpriseSearch.ingestSelector.method.connectorButtonLabel',
                {
                  defaultMessage: 'Create a connector',
                }
              )}
              buttonIcon={ConnectorIcon}
              description={i18n.translate(
                'xpack.enterpriseSearch.ingestSelector.method.connectors.description',
                {
                  defaultMessage:
                    'Extract, transform, index and sync data from a third-party data source.',
                }
              )}
              href={generatePath(
                ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + NEW_INDEX_SELECT_CONNECTOR_PATH
              )}
              logo={connectorLogo}
              title={i18n.translate('xpack.enterpriseSearch.ingestSelector.method.connectors', {
                defaultMessage: 'Connectors',
              })}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem>
          <IngestionCard
            logo={languageClientsLogo}
            title={i18n.translate('xpack.enterpriseSearch.ingestSelector.method.languageClients', {
              defaultMessage: 'Language clients',
            })}
            description={i18n.translate(
              'xpack.enterpriseSearch.ingestSelector.method.languageClients.description',
              {
                defaultMessage:
                  'Explore all the language clients we support and how to use them with our API.',
              }
            )}
            buttonIcon="visVega"
            buttonLabel={i18n.translate(
              'xpack.enterpriseSearch.ingestSelector.method.browseClientsLabel',
              {
                defaultMessage: 'Browse clients',
              }
            )}
            href={generatePath(ENTERPRISE_SEARCH_ELASTICSEARCH_URL)}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <IngestionCard
            logo={fileUploadLogo}
            title={i18n.translate('xpack.enterpriseSearch.ingestSelector.method.fileUpload', {
              defaultMessage: 'Upload a file',
            })}
            description={i18n.translate(
              'xpack.enterpriseSearch.ingestSelector.method.fileUpload.description',
              {
                defaultMessage:
                  'Delimited text files, such as CSV and TSV, Newline-delimited JSON.',
              }
            )}
            buttonIcon="exportAction"
            buttonLabel={i18n.translate(
              'xpack.enterpriseSearch.ingestSelector.method.fileUploadLabel',
              {
                defaultMessage: 'Choose a file',
              }
            )}
            onClick={() => navigateToApp('home', { path: '#/tutorial_directory/fileDataViz' })}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <IngestionCard
            logo={sampleDataLogo}
            title={i18n.translate('xpack.enterpriseSearch.ingestSelector.method.sampleData', {
              defaultMessage: 'Sample data',
            })}
            description={i18n.translate(
              'xpack.enterpriseSearch.ingestSelector.method.sampleData.description',
              {
                defaultMessage:
                  'Use our ready to search data examples to try out a search experience.',
              }
            )}
            buttonIcon="importAction"
            buttonLabel={i18n.translate(
              'xpack.enterpriseSearch.ingestSelector.method.importDataLabel',
              {
                defaultMessage: 'Import data',
              }
            )}
            onClick={() => navigateToApp('home', { path: '#/tutorial_directory/sampleData' })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
