/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../common/types/api';
import { docLinks } from '../../../../shared/doc_links';
import { KibanaLogic } from '../../../../shared/kibana';
import { LicensingLogic } from '../../../../shared/licensing';
import { AddConnectorApiLogic } from '../../../api/connector/add_connector_api_logic';

import { FetchCloudHealthApiLogic } from '../../../api/stats/fetch_cloud_health_api_logic';
import { NATIVE_CONNECTORS } from '../../search_index/connector/constants';
import {
  LicensingCallout,
  LICENSING_FEATURE,
} from '../../shared/licensing_callout/licensing_callout';
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
  const { isCloud, cloud } = useValues(KibanaLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { data: cloudHealthData } = useValues(FetchCloudHealthApiLogic);

  const isNative =
    Boolean(NATIVE_CONNECTORS.find((connector) => connector.serviceType === serviceType)) &&
    (isCloud || hasPlatinumLicense);

  const isGated = isNative && !isCloud && !hasPlatinumLicense;
  const hasLowMemory =
    isNative && isCloud && cloudHealthData && !cloudHealthData.has_min_connector_memory;

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
      {hasLowMemory && (
        <EuiFlexItem>
          <EuiCallOut
            title={i18n.translate(
              'xpack.enterpriseSearch.content.nativeConnector.memoryCallout.title',
              {
                defaultMessage: 'Your Enterprise Search deployment does not have enough memory',
              }
            )}
            color="warning"
            iconType="warning"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.nativeConnector.memoryCallout.content',
              {
                defaultMessage:
                  'Enterprise Search needs at least 4GB of memory to use a native connector. To proceed, please edit your deployment settings.',
              }
            )}
            <EuiSpacer />
            <EuiLink href={cloud.baseUrl} external>
              {i18n.translate(
                'xpack.enterpriseSearch.content.nativeConnector.memoryCallout.link.title',
                {
                  defaultMessage: 'Manage deployment',
                }
              )}
            </EuiLink>
          </EuiCallOut>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <NewSearchIndexTemplate
          docsUrl={docLinks.connectors}
          disabled={isGated || hasLowMemory}
          error={errorToText(error)}
          type="connector"
          onNameChange={() => {
            apiReset();
          }}
          onSubmit={(name, lang) =>
            makeRequest({ indexName: name, isNative, language: lang, serviceType })
          }
          buttonLoading={status === Status.LOADING}
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
