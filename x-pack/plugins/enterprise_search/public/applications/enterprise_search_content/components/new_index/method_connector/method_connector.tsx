/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiConfirmModal, EuiLink, EuiSteps, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import {
  APP_SEARCH_URL,
  ENTERPRISE_SEARCH_ELASTICSEARCH_URL,
} from '../../../../../../common/constants';

import { HttpError, Status } from '../../../../../../common/types/api';
import { ErrorCode } from '../../../../../../common/types/error_codes';
import { docLinks } from '../../../../shared/doc_links';
import { EuiLinkTo } from '../../../../shared/react_router_helpers';
import { AddConnectorPackageApiLogic } from '../../../api/connector_package/add_connector_package_api_logic';

import { NewSearchIndexLogic } from '../new_search_index_logic';
import { NewSearchIndexTemplate } from '../new_search_index_template';

import { AddConnectorPackageLogic } from './add_connector_package_logic';

const errorToMessage = (error?: HttpError): string | undefined => {
  if (!error) {
    return undefined;
  }
  if (error.body?.attributes?.error_code === ErrorCode.INDEX_ALREADY_EXISTS) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.error.indexAlreadyExists',
      {
        defaultMessage: 'This index already exists',
      }
    );
  }
  if (error.body?.attributes?.error_code === ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.error.connectorAlreadyExists',
      {
        defaultMessage: 'A connector for this index already exists',
      }
    );
  }
  if (error?.body?.statusCode === 403) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.error.unauthorizedError',
      {
        defaultMessage: 'You are not authorized to create this connector',
      }
    );
  } else
    return i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.error.genericError',
      {
        defaultMessage: 'We were not able to create your index',
      }
    );
};

export const MethodConnector: React.FC = () => {
  const { apiReset, makeRequest } = useActions(AddConnectorPackageApiLogic);
  const { error, status } = useValues(AddConnectorPackageApiLogic);
  const { isModalVisible } = useValues(AddConnectorPackageLogic);
  const { setIsModalVisible } = useActions(AddConnectorPackageLogic);
  const { fullIndexName, language } = useValues(NewSearchIndexLogic);

  const confirmModal = isModalVisible && (
    <EuiConfirmModal
      title={i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.confirmModal.title',
        {
          defaultMessage: 'Replace existing connector',
        }
      )}
      onCancel={(event) => {
        event?.preventDefault();
        setIsModalVisible(false);
      }}
      onConfirm={(event) => {
        event.preventDefault();
        makeRequest({ deleteExistingConnector: true, indexName: fullIndexName, language });
      }}
      cancelButtonText={i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.confirmModal.cancelButton.label',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.confirmModal.confirmButton.label',
        {
          defaultMessage: 'Replace configuration',
        }
      )}
      defaultFocusedButton="confirm"
    >
      {i18n.translate(
        'xpack.enterpriseSearch.content..newIndex.steps.buildConnector.confirmModal.description',
        {
          defaultMessage:
            'A deleted index named {indexName} was originally tied to an existing connector configuration. Would you like to replace the existing connector configuration with a new one?',
          values: {
            indexName: fullIndexName,
          },
        }
      )}
    </EuiConfirmModal>
  );

  return (
    <NewSearchIndexTemplate
      docsUrl="https://github.com/elastic/connectors-ruby/blob/main/README.md"
      error={errorToMessage(error)}
      title={i18n.translate('xpack.enterpriseSearch.content.newIndex.steps.buildConnector.title', {
        defaultMessage: 'Build a connector',
      })}
      type="connector"
      onNameChange={() => {
        apiReset();
      }}
      onSubmit={(name, lang) => makeRequest({ indexName: name, language: lang })}
      buttonLoading={status === Status.LOADING}
    >
      <EuiSteps
        steps={[
          {
            children: (
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.newIndex.methodConnector.steps.createConnectorIndex.content"
                    defaultMessage="Provide a unique index name and optionally set a default {languageAnalyzerDocLink} for the index. This index will hold your data source content, and is optimized with default field mappings for relevant search experiences."
                    values={{
                      languageAnalyzerDocLink: (
                        <EuiLink href={docLinks.languageAnalyzers} target="_blank" external>
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.newIndex.methodConnector.steps.createConnectorIndex.languageAnalyzerLink',
                            { defaultMessage: 'language analyzer' }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            ),
            status: 'incomplete',
            title: i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.steps.createIndex.title',
              {
                defaultMessage: 'Create an Elasticsearch index',
              }
            ),

            titleSize: 'xs',
          },
          {
            children: (
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.newIndex.steps.buildConnector.content"
                    defaultMessage="Using our connector framework and connector client examples, you’ll be able to accelerate ingestion to the Elasticsearch {bulkApiDocLink} for any data source. After creating your index, you will be guided through the steps to access the connector framework and connect your first connector client."
                    values={{
                      bulkApiDocLink: (
                        <EuiLink href={docLinks.bulkApi} target="_blank" external>
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.newIndex.methodConnector.steps.buildConnector.bulkAPILink',
                            { defaultMessage: 'Bulk API' }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            ),
            status: 'incomplete',
            title: i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.methodConnector.steps.buildConnector.title',
              {
                defaultMessage: 'Build and configure a connector',
              }
            ),
            titleSize: 'xs',
          },
          {
            children: (
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.newIndex.connector.steps.buildSearchExperience.content"
                    defaultMessage="After building your connector, your content is ready. Build your first search experience with {elasticsearchLink}, or explore the search experience tools provided by {appSearchLink}. We recommend that you create a {searchEngineLink} for the best balance of flexible power and turnkey simplicity."
                    values={{
                      appSearchLink: (
                        <EuiLinkTo to={APP_SEARCH_URL} shouldNotCreateHref>
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.newIndex.methodConnector.steps.buildConnector.appSearchLink',
                            { defaultMessage: 'App Search' }
                          )}
                        </EuiLinkTo>
                      ),
                      elasticsearchLink: (
                        <EuiLinkTo to={ENTERPRISE_SEARCH_ELASTICSEARCH_URL} shouldNotCreateHref>
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.newIndex.methodConnector.steps.buildConnector.elasticsearchLink',
                            { defaultMessage: 'Elasticsearch' }
                          )}
                        </EuiLinkTo>
                      ),
                      searchEngineLink: (
                        <EuiLinkTo to={`${APP_SEARCH_URL}/engines/new`} shouldNotCreateHref>
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.newIndex.methodConnector.steps.buildConnector.searchEngineLink',
                            { defaultMessage: 'search engine' }
                          )}
                        </EuiLinkTo>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            ),
            status: 'incomplete',
            title: i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.steps.buildSearchExperience.title',
              {
                defaultMessage: 'Build a search experience',
              }
            ),
            titleSize: 'xs',
          },
        ]}
      />
      {confirmModal}
    </NewSearchIndexTemplate>
  );
};
