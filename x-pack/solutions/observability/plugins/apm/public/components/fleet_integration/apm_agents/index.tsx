/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { Fragment } from 'react';
import { AgentInstructionsAccordion } from './agent_instructions_accordion';
import { ApmAgentInstructionsMappings } from './agent_instructions_mappings';
import type { PackagePolicyEditExtensionComponentProps } from '../apm_policy_form/typings';

export function ApmAgents({ newPolicy }: PackagePolicyEditExtensionComponentProps) {
  const vars = newPolicy?.inputs?.[0]?.vars;
  const apmServerUrl = vars?.url.value;
  const secretToken = vars?.secret_token.value;

  return (
    <div>
      {ApmAgentInstructionsMappings.map(
        ({ agentName, title, createAgentInstructions, variantId }) => (
          <Fragment key={`${agentName}-${variantId}`}>
            <EuiPanel>
              <AgentInstructionsAccordion
                agentName={agentName}
                title={title}
                createAgentInstructions={createAgentInstructions}
                variantId={variantId}
                apmServerUrl={apmServerUrl}
                secretToken={secretToken}
              />
            </EuiPanel>
            <EuiSpacer />
          </Fragment>
        )
      )}
    </div>
  );
}
