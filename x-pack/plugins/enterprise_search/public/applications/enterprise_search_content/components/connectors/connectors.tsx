/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { IngestionStatus } from '../../types';
import { EnterpriseSearchContentPageTemplate } from '../layout';
import { SelectConnector } from '../new_index/select_connector/select_connector';

import { ConnectorStats } from './connector_stats';
import { ConnectorsTable } from './connectors_table';

export const baseBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.content.connectors.breadcrumb', {
    defaultMessage: 'Connectors',
  }),
];
export const Connectors: React.FC = () => {
  // Check if empty
  // Spinner while loading
  // if empty -> show selectconnector
  // if not empty use table.
  // get filtered endpoint
  // add stats
  // make table searchable
  const isEmpty = false;
  const isLoading = false;
  return (
    <>
      {isEmpty ? (
        <SelectConnector />
      ) : (
        <EnterpriseSearchContentPageTemplate
          pageChrome={baseBreadcrumbs}
          pageViewTelemetry="Connectors"
          isLoading={isLoading}
          pageHeader={{
            pageTitle: 'Elasticsearch Connectors',
            rightSideGroupProps: {
              gutterSize: 's',
            },
            rightSideItems: isLoading
              ? []
              : [
                  <EuiButton color="primary" iconType="plusInCircle" fill>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.connectors.newConnectorButtonLabel"
                      defaultMessage="New Connector"
                    />
                  </EuiButton>,
                  <EuiButton>
                    {i18n.translate(
                      'xpack.enterpriseSearch.connectors.newNativeConnectorButtonLabel',
                      { defaultMessage: 'New Native Connector' }
                    )}
                  </EuiButton>,
                  <EuiButton>
                    {i18n.translate(
                      'xpack.enterpriseSearch.connectors.newConnectorsClientButtonLabel',
                      { defaultMessage: 'New Connectors Client' }
                    )}
                  </EuiButton>,
                ],
          }}
        >
          <ConnectorStats />
          <ConnectorsTable
            items={[
              {
                connector_name: '123',
                docs_count: '123123',
                index_name: 'test',
                status: IngestionStatus.CONFIGURED,
                type: 'test',
              },
            ]}
          />
        </EnterpriseSearchContentPageTemplate>
      )}
    </>
  );
};
