/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiLinkAnchorProps } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { memo } from 'react';

import { AGENT_SAVED_OBJECT_TYPE } from '../../common/constants/agent';
import { useLink } from '../hooks/use_link';

/**
 * Displays the provided `count` number as a link to the Agents list if it is greater than zero
 */
export const LinkedAgentCount = memo<
  Omit<EuiLinkAnchorProps, 'href'> & {
    count: number;
    agentPolicyId: string;
    showAgentText?: boolean;
  }
>(({ count, agentPolicyId, showAgentText, ...otherEuiLinkProps }) => {
  const { getHref } = useLink();
  const displayValue = showAgentText ? (
    <FormattedMessage
      id="xpack.fleet.agentPolicy.linkedAgentCountText"
      defaultMessage="{count, plural, one {# agent} other {# agents}}"
      values={{ count }}
    />
  ) : (
    count
  );
  return count > 0 ? (
    <EuiLink
      {...otherEuiLinkProps}
      href={getHref('agent_list', {
        kuery: `${AGENT_SAVED_OBJECT_TYPE}.policy_id : ${agentPolicyId}`,
      })}
    >
      {displayValue}
    </EuiLink>
  ) : (
    <span
      data-test-subj={otherEuiLinkProps['data-test-subj']}
      className={otherEuiLinkProps.className}
    >
      {displayValue}
    </span>
  );
});
