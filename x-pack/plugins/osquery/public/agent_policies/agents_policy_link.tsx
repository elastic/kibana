/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { PLUGIN_ID } from '../../../fleet/common';
import { pagePathGetters } from '../../../fleet/public';
import { useKibana, isModifiedEvent, isLeftClickEvent } from '../common/lib/kibana';
import { useAgentPolicy } from './use_agent_policy';

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
        path: `#` + pagePathGetters.policy_details({ policyId }),
      }),
    [getUrlForApp, policyId]
  );

  const handleClick = useCallback(
    (event) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event)) {
        event.preventDefault();

        return navigateToApp(PLUGIN_ID, {
          path: `#` + pagePathGetters.policy_details({ policyId }),
        });
      }
    },
    [navigateToApp, policyId]
  );

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink href={href} onClick={handleClick}>
      {data?.name ?? policyId}
    </EuiLink>
  );
};

export const AgentsPolicyLink = React.memo(AgentsPolicyLinkComponent);
