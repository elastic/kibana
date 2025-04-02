/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiBasicTableColumn, EuiButton } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { Agent } from '../../../../../common/agents';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../app_paths';

interface AgentListViewProps {
  agents: Agent[];
}

export const AgentListView: React.FC<AgentListViewProps> = ({ agents }) => {
  const { navigateToWorkchatUrl } = useNavigation();
  const columns: Array<EuiBasicTableColumn<Agent>> = [
    { field: 'name', name: 'Name' },
    { field: 'description', name: 'Description' },
    { field: 'user.name', name: 'Created by' },
    { field: 'public', name: 'Public' },
    {
      name: 'Actions',
      actions: [
        {
          name: 'Edit',
          description: 'Edit this agent',
          isPrimary: true,
          icon: 'documentEdit',
          type: 'icon',
          onClick: ({ id }) => {
            navigateToWorkchatUrl(appPaths.agents.edit({ agentId: id }));
          },
          'data-test-subj': 'agentListTable-edit-btn',
        },
      ],
    },
  ];

  return (
    <KibanaPageTemplate panelled>
      <KibanaPageTemplate.Header pageTitle="Agents" />

      <KibanaPageTemplate.Section grow={false} paddingSize="m">
        <EuiButton
          onClick={() => {
            return navigateToWorkchatUrl('/agents/create');
          }}
        >
          Create new agent
        </EuiButton>
      </KibanaPageTemplate.Section>

      <KibanaPageTemplate.Section>
        <EuiBasicTable columns={columns} items={agents} />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
