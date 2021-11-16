/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { PLUGIN_ID } from '../../../fleet/common';
import { pagePathGetters } from '../../../fleet/public';
import { useKibana, isModifiedEvent, isLeftClickEvent } from '../common/lib/kibana';
import { useAgentPolicy } from './use_agent_policy';

const StyledEuiLink = styled(EuiLink)`
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`;

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
    <StyledEuiLink href={href} onClick={handleClick}>
      {data?.name ?? policyId}
    </StyledEuiLink>
  );
};

export const AgentsPolicyLink = React.memo(AgentsPolicyLinkComponent);
