/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useLocation } from 'react-router-dom';

import {
  EuiButton,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormFieldset,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { INGESTION_METHOD_IDS } from '../../../../../../common/constants';

import { BACK_BUTTON_LABEL, CONTINUE_BUTTON_LABEL } from '../../../../shared/constants';
import { generateEncodedPath } from '../../../../shared/encode_path_params';

import { KibanaLogic } from '../../../../shared/kibana';
import { parseQueryParams } from '../../../../shared/query_params';

import { NEW_INDEX_METHOD_PATH, NEW_INDEX_PATH } from '../../../routes';
import { EnterpriseSearchContentPageTemplate } from '../../layout';

import { CONNECTORS } from '../../search_index/connector/constants';

import { baseBreadcrumbs } from '../../search_indices';

import { ConnectorCheckable } from './connector_checkable';

export const SelectConnector: React.FC = () => {
  const { search } = useLocation();
  const { service_type: serviceType } = parseQueryParams(search);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(
    Array.isArray(serviceType) ? serviceType[0] : serviceType ?? null
  );

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...baseBreadcrumbs, 'Select connector']}
      pageViewTelemetry="select_connector"
      isLoading={false}
      pageHeader={{
        description: i18n.translate(
          'xpack.enterpriseSearch.content.indices.selectConnector.description',
          {
            defaultMessage: 'A connector will sync data from a data source.',
          }
        ),
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.indices.selectConnector.title', {
          defaultMessage: 'Select a connector',
        }),
      }}
    >
      <EuiForm
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          KibanaLogic.values.navigateToUrl(
            `${generateEncodedPath(NEW_INDEX_METHOD_PATH, {
              type: INGESTION_METHOD_IDS.CONNECTOR,
            })}?service_type=${selectedConnector}`
          );
        }}
      >
        <EuiFormFieldset
          legend={{
            children: (
              <EuiText color="subdued" size="s">
                <p />
              </EuiText>
            ),
          }}
        >
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={3}>
            {CONNECTORS.map((connector) => (
              <EuiFlexItem key={connector.serviceType}>
                <ConnectorCheckable
                  icon={connector.icon}
                  isBeta={connector.isBeta}
                  name={connector.name}
                  serviceType={connector.serviceType}
                  onChange={() => {
                    setSelectedConnector(connector.serviceType);
                  }}
                  documentationUrl={connector.docsUrl}
                  checked={selectedConnector === connector.serviceType}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
          <EuiSpacer />
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem>
              <span>
                <EuiButton
                  data-telemetry-id="entSearchContent-connector-selectConnector-backButton"
                  color="primary"
                  onClick={() => KibanaLogic.values.navigateToUrl(NEW_INDEX_PATH)}
                >
                  {BACK_BUTTON_LABEL}
                </EuiButton>
              </span>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span>
                <EuiButton
                  data-telemetry-id="entSearchContent-connector-selectConnector-selectAndConfigure"
                  disabled={!selectedConnector}
                  fill
                  color="primary"
                  type="submit"
                >
                  {CONTINUE_BUTTON_LABEL}
                </EuiButton>
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormFieldset>
      </EuiForm>
    </EnterpriseSearchContentPageTemplate>
  );
};
