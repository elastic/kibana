/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { useKibana, isModifiedEvent, isLeftClickEvent } from '../common/lib/kibana';
import { useAgentPolicy } from './use_agent_policy';

const euiLinkCss = {
  whiteSpace: 'nowrap' as const,
  textOverflow: 'ellipsis',
  overflow: 'hidden',
};

interface AgentsPolicyLinkProps {
  policyId: string;
}

const AgentsPolicyLinkComponent: React.FC<AgentsPolicyLinkProps> = ({ policyId }) => {
  const {
    application: { getUrlForApp, navigateToApp },
  } = useKibana().services;
  const { data } = useAgentPolicy({ policyId });

  const href = useMemo(
    () =>
      getUrlForApp(PLUGIN_ID, {
        path: pagePathGetters.policy_details({ policyId })[1],
      }),
    [getUrlForApp, policyId]
  );

  const handleClick = useCallback(
    (event) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event)) {
        event.preventDefault();

        return navigateToApp(PLUGIN_ID, {
          path: pagePathGetters.policy_details({ policyId })[1],
        });
      }
    },
    [navigateToApp, policyId]
  );

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink href={href} onClick={handleClick} css={euiLinkCss}>
      {data?.name ?? policyId}
    </EuiLink>
  );
};

export const AgentsPolicyLink = React.memo(AgentsPolicyLinkComponent);
