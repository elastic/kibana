/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiConfirmModal, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../common/types/api';
import { docLinks } from '../../../../shared/doc_links';
import { KibanaLogic } from '../../../../shared/kibana';
import { LicensingLogic } from '../../../../shared/licensing';
import {
  LicensingCallout,
  LICENSING_FEATURE,
} from '../../../../shared/licensing_callout/licensing_callout';
import { AddConnectorApiLogic } from '../../../api/connector/add_connector_api_logic';

import { FetchCloudHealthApiLogic } from '../../../api/stats/fetch_cloud_health_api_logic';
import { BETA_CONNECTORS, NATIVE_CONNECTORS } from '../../search_index/connector/constants';
import { NewSearchIndexLogic } from '../new_search_index_logic';
import { NewSearchIndexTemplate } from '../new_search_index_template';

import { errorToText } from '../utils/error_to_text';

import { AddConnectorLogic } from './add_connector_logic';

interface MethodConnectorProps {
  serviceType: string;
}

export const MethodConnector: React.FC<MethodConnectorProps> = ({ serviceType }) => {
  const { apiReset, makeRequest } = useActions(AddConnectorApiLogic);
  const { error, status } = useValues(AddConnectorApiLogic);
  const { isModalVisible } = useValues(AddConnectorLogic);
  const { setIsModalVisible } = useActions(AddConnectorLogic);
  const { fullIndexName, language } = useValues(NewSearchIndexLogic);
  const { isCloud } = useValues(KibanaLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const isNative =
    Boolean(NATIVE_CONNECTORS.find((connector) => connector.serviceType === serviceType)) &&
    isCloud;
  const isBeta = Boolean(
    BETA_CONNECTORS.find((connector) => connector.serviceType === serviceType)
  );

  const isGated = isNative && !isCloud && !hasPlatinumLicense;

  const { makeRequest: fetchCloudHealth } = useActions(FetchCloudHealthApiLogic);

  useEffect(() => {
    if (isCloud) {
      fetchCloudHealth({});
    }
  }, [isCloud]);

  return (
    <EuiFlexGroup direction="column">
      {isGated && (
        <EuiFlexItem>
          <LicensingCallout feature={LICENSING_FEATURE.NATIVE_CONNECTOR} />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <NewSearchIndexTemplate
          docsUrl={docLinks.connectors}
          disabled={isGated}
          error={errorToText(error)}
          type="connector"
          onNameChange={() => {
            apiReset();
          }}
          onSubmit={(name, lang) =>
            makeRequest({ indexName: name, isNative, language: lang, serviceType })
          }
          buttonLoading={status === Status.LOADING}
          isBeta={isBeta}
        />

        {isModalVisible && (
          <EuiConfirmModal
            title={i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.confirmModal.title',
              {
                defaultMessage: 'Replace existing connector',
              }
            )}
            onCancel={() => {
              setIsModalVisible(false);
            }}
            onConfirm={() => {
              makeRequest({
                deleteExistingConnector: true,
                indexName: fullIndexName,
                isNative,
                language,
                serviceType,
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
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
