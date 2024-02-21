/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiCallOut, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../../../../common/constants';

import { docLinks } from '../../../shared/doc_links';
import { KibanaLogic } from '../../../shared/kibana';
import { isConnectorIndex } from '../../utils/indices';

import { ConvertConnectorLogic } from '../search_index/connector/native_connector_configuration/convert_connector_logic';
import { SyncJobs } from '../search_index/sync_jobs/sync_jobs';

import { ConvertConnectorModal } from '../shared/convert_connector_modal/convert_connector_modal';

import { ConnectorStats } from './connector_stats';
import { ConnectorViewLogic } from './connector_view_logic';
import { OverviewLogic } from './overview.logic';

export const ConnectorDetailOverview: React.FC = () => {
  const { indexData } = useValues(OverviewLogic);
  const { connector } = useValues(ConnectorViewLogic);
  const error = null;
  const { isCloud } = useValues(KibanaLogic);
  const { showModal } = useActions(ConvertConnectorLogic);
  const { isModalVisible } = useValues(ConvertConnectorLogic);

  return (
    <>
      <EuiSpacer />
      {isConnectorIndex(indexData) && error && (
        <>
          <EuiCallOut
            iconType="warning"
            color="danger"
            title={i18n.translate(
              'xpack.enterpriseSearch.content.connectors.overview.connectorErrorCallOut.title',
              {
                defaultMessage: 'Your connector has reported an error',
              }
            )}
          >
            <EuiSpacer size="s" />
            <EuiText size="s">{error}</EuiText>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      {isConnectorIndex(indexData) && indexData.connector.is_native && !isCloud && (
        <>
          {isModalVisible && <ConvertConnectorModal />}
          <EuiCallOut
            iconType="warning"
            color="warning"
            title={i18n.translate(
              'xpack.enterpriseSearch.content.connectors.overview.nativeCloudCallout.title',
              {
                defaultMessage: 'Native connectors are no longer supported outside Elastic Cloud',
              }
            )}
          >
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.connectors.overview.nativeCloudCallout.content"
                  defaultMessage="Convert it to a {link}, to be self-managed on your own infrastructure. Native connectors are available only in your Elastic Cloud deployment."
                  values={{
                    link: (
                      <EuiLink href={docLinks.buildConnector} target="_blank">
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.connectors.overview.nativeCloudCallout.connectorClient',
                          { defaultMessage: 'connector client' }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiButton color="warning" fill onClick={() => showModal()}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.connectors.overview.convertConnector.buttonLabel',
                { defaultMessage: 'Convert connector' }
              )}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      {connector && connector.service_type !== ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE && (
        <ConnectorStats
          connector={connector}
          indexData={isConnectorIndex(indexData) ? indexData : undefined}
        />
      )}
      {connector && connector.service_type !== ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE && (
        <>
          <EuiSpacer />
          <SyncJobs />
        </>
      )}
    </>
  );
};
