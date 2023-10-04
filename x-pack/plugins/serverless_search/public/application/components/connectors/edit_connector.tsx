/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useQuery } from '@tanstack/react-query';
import { Connector } from '@kbn/search-connectors';
import React from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { CONNECTOR_LABEL } from '../../../../common/i18n_string';
import { useKibanaServices } from '../../hooks/use_kibana';
import { BASE_CONNECTORS_PATH } from '../connectors_router';
import { EditName } from './edit_name';
import { EditServiceType } from './edit_service_type';
import { EditDescription } from './edit_description';

export const EditConnector: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    application: { navigateToUrl },
    http,
  } = useKibanaServices();

  const { data, isLoading, refetch } = useQuery({
    queryKey: [`fetchConnector${id}`],
    queryFn: () =>
      http.fetch<{ connector: Connector }>(`/internal/serverless_search/connector/${id}`),
  });

  if (isLoading) {
    <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchEditConnectorsPage">
      <EuiPageTemplate.EmptyPrompt
        title={
          <h1>
            {i18n.translate('xpack.serverlessSearch.connectors.loading', {
              defaultMessage: 'Loading',
            })}
          </h1>
        }
      />
    </EuiPageTemplate>;
  }
  if (!data?.connector) {
    return (
      <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchEditConnectorsPage">
        <EuiPageTemplate.EmptyPrompt
          title={
            <h1>
              {i18n.translate('xpack.serverlessSearch.connectors.notFound', {
                defaultMessage: 'Could not find a connector with id {id}',
                values: { id },
              })}
            </h1>
          }
          actions={
            <EuiButton color="primary" fill onClick={() => navigateToUrl(BASE_CONNECTORS_PATH)}>
              {i18n.translate('xpack.serverlessSearch.connectors.goBack', {
                defaultMessage: 'Go back',
              })}
            </EuiButton>
          }
        />
      </EuiPageTemplate>
    );
  }

  const { connector } = data;

  return (
    <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchEditConnectorsPage">
      <EuiPageTemplate.Section grow={false}>
        <EuiText size="s">{CONNECTOR_LABEL}</EuiText>
        <EuiFlexGroup direction="row" justifyContent="spaceBetween">
          <EuiFlexItem>
            <EditName connectorId={id} name={connector.name} onSuccess={refetch} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span>
              <EuiButtonIcon
                aria-label={i18n.translate('xpack.serverlessSearch.connectors.openMenuLabel', {
                  defaultMessage: 'Open menu',
                })}
                iconType="boxesVertical"
              />
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section>
        <EuiFlexGroup direction="row">
          <EuiFlexItem>
            <EditServiceType
              connectorId={id}
              serviceType={connector.service_type ?? ''}
              onSuccess={() => refetch()}
            />
            <EuiSpacer />
            <EditDescription
              connectorId={id}
              description={connector.description ?? ''}
              onSuccess={refetch}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
