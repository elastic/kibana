/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiLink } from '@elastic/eui';
import { useLink } from '../hooks';
import { AGENT_SAVED_OBJECT_TYPE } from '../constants';

/**
 * Displays the provided `count` number as a link to the Agents list if it is greater than zero
 */
export const LinkedAgentCount = memo<{ count: number; agentPolicyId: string }>(
  ({ count, agentPolicyId }) => {
    const { getHref } = useLink();
    return count > 0 ? (
      <EuiLink
        href={getHref('fleet_agent_list', {
          kuery: `${AGENT_SAVED_OBJECT_TYPE}.policy_id : ${agentPolicyId}`,
        })}
      >
        {count}
      </EuiLink>
    ) : (
      <>count</>
    );
  }
);
