/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiToolTip } from '@elastic/eui';
import React from 'react';

import { useAgentDetails } from './use_agent_details';
import { PLUGIN_ID } from '../../../fleet/common';
import { pagePathGetters } from '../../../fleet/public';
import { useKibana } from '../common/lib/kibana';

interface AgentIdToNameProps {
  agentId: string;
}

const AgentIdToNameComponent: React.FC<AgentIdToNameProps> = ({ agentId }) => {
  const getUrlForApp = useKibana().services.application.getUrlForApp;
  const { data } = useAgentDetails({ agentId, skip: !agentId });

  return (
    <EuiToolTip position="top" content={<p>{agentId}</p>}>
      <EuiLink
        className="eui-textTruncate"
        href={getUrlForApp(PLUGIN_ID, {
          path: pagePathGetters.agent_details({ agentId })[1],
        })}
        target="_blank"
      >
        {data?.local_metadata.host.name ?? agentId}
      </EuiLink>
    </EuiToolTip>
  );
};

export const AgentIdToName = React.memo(AgentIdToNameComponent);
