/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPageTemplate,
  EuiText,
} from '@elastic/eui';
import { Connector } from '@kbn/search-connectors';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMutation } from '@tanstack/react-query';
import React, { useEffect } from 'react';

import { generatePath } from 'react-router-dom';
import { LEARN_MORE_LABEL } from '../../../common/i18n_string';
import { PLUGIN_ID } from '../../../common';
import { useConnectors } from '../hooks/api/use_connectors';
import { useKibanaServices } from '../hooks/use_kibana';
import { EmptyConnectorsPrompt } from './connectors/empty_connectors_prompt';
import { ConnectorsTable } from './connectors/connectors_table';
import { EDIT_CONNECTOR_PATH } from './connectors_router';

export const ConnectorsOverview = () => {
  const { data, isLoading: connectorsLoading } = useConnectors();
  const {
    application: { navigateToUrl },
    http,
  } = useKibanaServices();

  const {
    data: connector,
    isLoading,
    isSuccess,
    mutate,
  } = useMutation({
    mutationFn: async () => {
      const result = await http.post<{ connector: Connector }>(
        '/internal/serverless_search/connectors'
      );
      return result.connector;
    },
  });

  useEffect(() => {
    if (isSuccess) {
      navigateToUrl(generatePath(EDIT_CONNECTOR_PATH, { id: connector?.id || '' }));
    }
  }, [connector, isSuccess, navigateToUrl]);

  const createConnector = () => mutate();

  return (
    <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchConnectorsPage">
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.serverlessSearch.connectors.title', {
          defaultMessage: 'Connectors',
        })}
        restrictWidth
        rightSideItems={[
          <EuiFlexGroup direction="row" alignItems="flexStart">
            <EuiFlexItem>
              <EuiFlexGroup
                alignItems="center"
                gutterSize="xs"
                justifyContent="flexEnd"
                direction="row"
              >
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    size="s"
                    type={http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets/github.svg`)}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <EuiLink target="_blank" href="https://github.com/elastic/connectors-python">
                      {i18n.translate('xpack.serverlessSearch.connectorsPythonLink', {
                        defaultMessage: 'connectors-python',
                      })}
                    </EuiLink>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                isLoading={isLoading}
                fill
                iconType="plusInCircleFilled"
                onClick={() => createConnector()}
              >
                {i18n.translate('xpack.serverlessSearch.connectors.createConnector', {
                  defaultMessage: 'Create connector',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>,
        ]}
      >
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.serverlessSearch.connectors.headerContent"
              defaultMessage="Sync third-party data sources to Elasticsearch, by deploying Elastic connectors on your own infrastructure. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink external target="_blank" href={'TODO TODO'}>
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiPageTemplate.Header>
      {connectorsLoading || (data?.connectors || []).length > 0 ? (
        <EuiPageTemplate.Section restrictWidth color="subdued">
          <ConnectorsTable />
        </EuiPageTemplate.Section>
      ) : (
        <EuiPageTemplate.Section restrictWidth color="subdued">
          <EmptyConnectorsPrompt />
        </EuiPageTemplate.Section>
      )}
    </EuiPageTemplate>
  );
};
