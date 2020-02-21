/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiPageBody, EuiPageContent, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AgentEventsTable, AgentDetailSection } from './components';
import { AgentRefreshContext } from './hooks';
import { Loading } from '../../../components';
import { useGetOneAgent } from '../../../hooks';

export const Layout: React.FunctionComponent = ({ children }) => (
  <EuiPageBody>
    <EuiPageContent>{children}</EuiPageContent>
  </EuiPageBody>
);

export const AgentDetailsPage: React.FunctionComponent = () => {
  const {
    params: { agentId },
  } = useRouteMatch();
  const agentRequest = useGetOneAgent(agentId, {
    pollIntervalMs: 5000,
  });

  if (agentRequest.isLoading && agentRequest.isInitialRequest) {
    return <Loading />;
  }

  if (agentRequest.error) {
    return (
      <Layout>
        <EuiCallOut
          title={i18n.translate('xpack.ingestManager.agentDetails.unexceptedErrorTitle', {
            defaultMessage: 'An error happened while loading the agent',
          })}
          color="danger"
          iconType="alert"
        >
          <p>
            <EuiText>{agentRequest.error.message}</EuiText>
          </p>
        </EuiCallOut>
      </Layout>
    );
  }

  if (!agentRequest.data) {
    return (
      <Layout>
        <FormattedMessage
          id="xpack.ingestManager.agentDetails.agentNotFoundErrorTitle"
          defaultMessage="Agent Not found"
        />
      </Layout>
    );
  }

  const agent = agentRequest.data.item;

  return (
    <AgentRefreshContext.Provider value={{ refresh: () => agentRequest.sendRequest() }}>
      <Layout>
        <AgentDetailSection agent={agent} />
        <EuiSpacer size="xl" />
        <AgentEventsTable agent={agent} />
      </Layout>
    </AgentRefreshContext.Provider>
  );
};
