/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { Agent, AgentPolicy, PackagePolicy } from '../../../../../types';

import { AgentDetailsIntegration } from './agent_details_integration';

export const AgentDetailsIntegrations: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
}> = memo(({ agent, agentPolicy }) => {
  if (!agentPolicy || !agentPolicy.package_policies) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {(agentPolicy.package_policies as PackagePolicy[]).map((packagePolicy, index) => {
        const testSubj = (packagePolicy.package?.name ?? 'packagePolicy') + '-' + index;

        return (
          <EuiFlexItem grow={false} key={packagePolicy.id} data-test-subj={testSubj}>
            <AgentDetailsIntegration
              agent={agent}
              agentPolicy={agentPolicy}
              packagePolicy={packagePolicy}
              data-test-subj={`${testSubj}-accordion`}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
});
