/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import { useLink } from '../hooks';
import { AGENT_SAVED_OBJECT_TYPE } from '../constants';

/**
 * Displays the provided `count` number as a link to the Agents list if it is greater than zero
 */
export const LinkedAgentCount = memo<
  Omit<EuiLinkAnchorProps, 'href'> & { count: number; agentPolicyId: string }
>(({ count, agentPolicyId, ...otherEuiLinkProps }) => {
  const { getHref } = useLink();
  return count > 0 ? (
    <EuiLink
      {...otherEuiLinkProps}
      href={getHref('fleet_agent_list', {
        kuery: `${AGENT_SAVED_OBJECT_TYPE}.policy_id : ${agentPolicyId}`,
      })}
    >
      {count}
    </EuiLink>
  ) : (
    <span
      data-test-subj={otherEuiLinkProps['data-test-subj']}
      className={otherEuiLinkProps.className}
    >
      {count}
    </span>
  );
});
