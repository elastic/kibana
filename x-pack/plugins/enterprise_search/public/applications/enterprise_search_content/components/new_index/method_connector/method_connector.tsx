/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add documentation URLs (search for `#`s)
 * - Port over Connector views from App Search to the panel below.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiConfirmModal, EuiSteps, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { HttpError, Status } from '../../../../../../common/types/api';
import { ErrorCode } from '../../../../../../common/types/error_codes';
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
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.steps.createIndex.content',
                    {
                      defaultMessage:
                        'Provide a unique name for your index and select an optional index language.',
                    }
                  )}
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
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.methodConnector.steps.configureIngestion.content',
                    {
                      defaultMessage:
                        'TODO TODO TODO Clone the connector package repository on GitHub and build a custom connector that suits your needs.',
                    }
                  )}
                </p>
              </EuiText>
            ),
            status: 'incomplete',
            title: i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.steps.configureIngestion.title',
              {
                defaultMessage: 'Configure ingestion settings',
              }
            ),
            titleSize: 'xs',
          },
          {
            children: (
              <EuiText size="s">
                <p>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.steps.buildSearchExperience.content',
                    {
                      defaultMessage:
                        'Connect your newly created Elasticsearch index to an App Search engine to build a cusomtizable search experience.',
                    }
                  )}
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
