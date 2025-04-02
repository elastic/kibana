/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiLink,
  EuiTitle,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { Agent } from '../../../../common/agents';
import { useNavigation } from '../../hooks/use_navigation';
import { useAgentList } from '../../hooks/use_agent_list';
import { useCapabilities } from '../../hooks/use_capabilities';
import { appPaths } from '../../app_paths';

export const HomeAgentSection: React.FC<{}> = () => {
  const { createWorkchatUrl, navigateToWorkchatUrl } = useNavigation();
  const { agents } = useAgentList();
  const { showManagement } = useCapabilities();

  const columns: Array<EuiBasicTableColumn<Agent>> = [
    {
      field: 'name',
      name: 'Name',
      render: (value, agent) => {
        return (
          <EuiLink href={createWorkchatUrl(appPaths.chat.new({ agentId: agent.id }))}>
            {value}
          </EuiLink>
        );
      },
    },
    { field: 'description', name: 'Description' },
    { field: 'user.name', name: 'Created by' },
  ];

  return (
    <KibanaPageTemplate.Section>
      <EuiTitle size="s">
        <h4>Your agents</h4>
      </EuiTitle>
      <EuiSpacer />
      <EuiBasicTable columns={columns} items={agents} />
      <EuiSpacer />
      {showManagement && (
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => {
                navigateToWorkchatUrl(appPaths.agents.list);
              }}
            >
              Go to agent management
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </KibanaPageTemplate.Section>
  );
};
