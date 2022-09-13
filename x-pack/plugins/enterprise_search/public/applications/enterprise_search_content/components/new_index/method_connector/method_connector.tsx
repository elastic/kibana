/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSteps,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { Status } from '../../../../../../common/types/api';
import { docLinks } from '../../../../shared/doc_links';
import { KibanaLogic } from '../../../../shared/kibana';
import { LicensingLogic } from '../../../../shared/licensing';
import { AddConnectorApiLogic } from '../../../api/connector/add_connector_api_logic';

import { LicensingCallout, LICENSING_FEATURE } from '../licensing_callout';
import { CREATE_ELASTICSEARCH_INDEX_STEP, BUILD_SEARCH_EXPERIENCE_STEP } from '../method_steps';
import { NewSearchIndexLogic } from '../new_search_index_logic';
import { NewSearchIndexTemplate } from '../new_search_index_template';

import { errorToText } from '../utils/error_to_text';

import { AddConnectorLogic } from './add_connector_logic';

export const MethodConnector: React.FC<{ isNative: boolean }> = ({ isNative }) => {
  const { apiReset, makeRequest } = useActions(AddConnectorApiLogic);
  const { error, status } = useValues(AddConnectorApiLogic);
  const { isModalVisible } = useValues(AddConnectorLogic);
  const { setIsModalVisible } = useActions(AddConnectorLogic);
  const { fullIndexName, language } = useValues(NewSearchIndexLogic);
  const { isCloud } = useValues(KibanaLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const isGated = isNative && !isCloud && !hasPlatinumLicense;

  return (
    <EuiFlexGroup direction="column">
      {isGated && (
        <EuiFlexItem>
          <LicensingCallout feature={LICENSING_FEATURE.NATIVE_CONNECTOR} />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <NewSearchIndexTemplate
          docsUrl="https://github.com/elastic/connectors-ruby/blob/main/README.md"
          disabled={isGated}
          error={errorToText(error)}
          title={i18n.translate(
            'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.title',
            {
              defaultMessage: 'Build a connector',
            }
          )}
          type="connector"
          onNameChange={() => {
            apiReset();
          }}
          onSubmit={(name, lang) => makeRequest({ indexName: name, isNative, language: lang })}
          buttonLoading={status === Status.LOADING}
        >
          <EuiSteps
            steps={[
              CREATE_ELASTICSEARCH_INDEX_STEP,
              isNative
                ? {
                    children: (
                      <EuiText size="s">
                        <p>
                          <FormattedMessage
                            id="xpack.enterpriseSearch.content.newIndex.steps.nativeConnector.content"
                            defaultMessage="Using our built-in connectors, you’ll be able to ingest data into your Elasticsearch index easily and swiftly using a number of Elastic-developed connectors."
                          />
                        </p>
                      </EuiText>
                    ),
                    status: 'incomplete',
                    title: i18n.translate(
                      'xpack.enterpriseSearch.content.newIndex.methodConnector.steps.nativeConnector.title',
                      {
                        defaultMessage: 'Use a pre-built connector to populate your index',
                      }
                    ),
                    titleSize: 'xs',
                  }
                : {
                    children: isNative ? (
                      <EuiText size="s">
                        <p>
                          <FormattedMessage
                            id="xpack.enterpriseSearch.content.newIndex.steps.nativeConnector.content"
                            defaultMessage="Using our built-in connectors, you’ll be able to ingest data into your Elasticsearch index easily and swiftly using a number of Elastic-developed connectors."
                          />
                        </p>
                      </EuiText>
                    ) : (
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
              BUILD_SEARCH_EXPERIENCE_STEP,
            ]}
          />
          {isModalVisible && (
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
                makeRequest({
                  deleteExistingConnector: true,
                  indexName: fullIndexName,
                  isNative,
                  language,
                });
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
                'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.confirmModal.description',
                {
                  defaultMessage:
                    'A deleted index named {indexName} was originally tied to an existing connector configuration. Would you like to replace the existing connector configuration with a new one?',
                  values: {
                    indexName: fullIndexName,
                  },
                }
              )}
            </EuiConfirmModal>
          )}
        </NewSearchIndexTemplate>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
