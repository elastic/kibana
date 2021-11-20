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
import {
  NewPackagePolicy,
  PackagePolicy,
  PackagePolicyEditExtensionComponentProps,
} from '../apm_policy_form/typings';

interface Props {
  policy: PackagePolicy;
  newPolicy: NewPackagePolicy;
  onChange: PackagePolicyEditExtensionComponentProps['onChange'];
}

export function ApmAgents({ newPolicy }: Props) {
  return (
    <div>
      {ApmAgentInstructionsMappings.map(
        ({ agentName, title, createAgentInstructions, variantId }) => (
          <Fragment key={agentName}>
            <EuiPanel>
              <AgentInstructionsAccordion
                agentName={agentName}
                title={title}
                newPolicy={newPolicy}
                createAgentInstructions={createAgentInstructions}
                variantId={variantId}
              />
            </EuiPanel>
            <EuiSpacer />
          </Fragment>
        )
      )}
    </div>
  );
}
