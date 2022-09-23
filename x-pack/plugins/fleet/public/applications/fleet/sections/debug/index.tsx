/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiCallOut,
  EuiHorizontalRule,
  EuiListGroup,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useLink, useStartServices } from '../../hooks';

import {
  AgentPolicyDebugger,
  IntegrationDebugger,
  PreconfigurationDebugger,
  FleetIndexDebugger,
  SavedObjectDebugger,
  OrphanedIntegrationPolicyDebugger,
} from './components';

// TODO: Evaluate moving this react-query initialization up to the main Fleet app
// setup if we end up pursuing wider adoption of react-query.
export const queryClient = new QueryClient();

const panels = [
  {
    title: i18n.translate('xpack.fleet.debug.agentPolicyDebugger.title', {
      defaultMessage: 'Agent Policy Debugger',
    }),
    id: 'agentPolicyDebugger',
    component: <AgentPolicyDebugger />,
  },
  {
    title: i18n.translate('xpack.fleet.debug.integrationDebugger.title', {
      defaultMessage: 'Integration Debugger',
    }),
    id: 'integrationDebugger',
    component: <IntegrationDebugger />,
  },
  {
    title: i18n.translate('xpack.fleet.debug.savedObjectDebugger.title', {
      defaultMessage: 'Saved Object Debugger',
    }),
    id: 'savedObjectDebugger',
    component: <SavedObjectDebugger />,
  },
  {
    title: i18n.translate('xpack.fleet.debug.fleetIndexDebugger.title', {
      defaultMessage: 'Fleet Index Debugger',
    }),
    id: 'fleetIndexDebugger',
    component: <FleetIndexDebugger />,
  },
  {
    title: i18n.translate('xpack.fleet.debug.preconfigurationDebugger.title', {
      defaultMessage: 'Preconfiguration Debugger',
    }),
    id: 'preconfigurationDebugger',
    component: <PreconfigurationDebugger />,
  },
  {
    title: i18n.translate('xpack.fleet.debug.orphanedIntegrationPolicyDebugger.title', {
      defaultMessage: 'Orphaned Integration Policy Debugger',
    }),
    id: 'orphanedIntegrationPolicyDebugger',
    component: <OrphanedIntegrationPolicyDebugger />,
  },
];

export const DebugPage: React.FunctionComponent = () => {
  const { chrome } = useStartServices();
  const { getHref } = useLink();

  chrome.docTitle.change(['Debug', 'Fleet']);

  return (
    <QueryClientProvider client={queryClient}>
      <EuiPage>
        <EuiPageBody panelled>
          <EuiPageHeader
            pageTitle={i18n.translate('xpack.fleet.debug.pageTitle', {
              defaultMessage: 'Fleet Debugging Dashboard',
            })}
            iconType="wrench"
          />
          <EuiCallOut color="danger" iconType="alert" title="Danger zone">
            <EuiText grow={false}>
              <FormattedMessage
                id="xpack.fleet.debug.dangerZone.description"
                defaultMessage="This page provides an interface for directly managing Fleet's underlying data and diagnosing issues. Be aware that these debugging tools can be {strongDestructive} in nature and can result in {strongLossOfData}. Please proceed with caution."
                values={{
                  strongDestructive: (
                    <strong>
                      <FormattedMessage
                        id="xpack.fleet.debug.dangerZone.destructive"
                        defaultMessage="destructive"
                      />
                    </strong>
                  ),
                  strongLossOfData: (
                    <strong>
                      <FormattedMessage
                        id="xpack.fleet.debug.dangerZone.lossOfData"
                        defaultMessage="loss of data"
                      />
                    </strong>
                  ),
                }}
              />
            </EuiText>
          </EuiCallOut>

          <EuiSpacer size="xl" />

          {panels.map(({ title, id, component }) => (
            <>
              <EuiAccordion
                id={id}
                initialIsOpen
                buttonContent={
                  <EuiTitle size="l">
                    <h2>{title}</h2>
                  </EuiTitle>
                }
              >
                <EuiSpacer size="m" />
                {component}
              </EuiAccordion>

              <EuiHorizontalRule />
            </>
          ))}

          <EuiTitle size="l">
            <h2>
              <FormattedMessage
                id="xpack.fleet.debug.usefulLinks.title"
                defaultMessage="Useful links"
              />
            </h2>
          </EuiTitle>

          <EuiSpacer size="m" />

          <EuiListGroup
            listItems={[
              {
                label: i18n.translate('xpack.fleet.debug.usefulLinks.viewAgents', {
                  defaultMessage: 'View Agents in Fleet UI',
                }),
                href: getHref('agent_list'),
                iconType: 'agentApp',
                target: '_blank',
              },
              {
                label: i18n.translate('xpack.fleet.debug.usefulLinks.troubleshootingGuide', {
                  defaultMessage: 'Troubleshooting Guide',
                }),
                href: 'https://www.elastic.co/guide/en/fleet/current/fleet-troubleshooting.html',
                iconType: 'popout',
                target: '_blank',
              },
            ]}
          />
        </EuiPageBody>
      </EuiPage>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
