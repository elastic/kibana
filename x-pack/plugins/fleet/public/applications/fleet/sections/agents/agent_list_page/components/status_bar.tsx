/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import { EuiColorPaletteDisplay } from '@elastic/eui';
import React, { useMemo } from 'react';
import { AGENT_STATUSES, getColorForAgentStatus } from '../../services/agent_status';
import { SimplifiedAgentStatus } from '../../../../types';

const StyledEuiColorPaletteDisplay = styled(EuiColorPaletteDisplay)`
  &.ingest-agent-status-bar {
    border: none;
    border-radius: 0;
    &:after {
      border: none;
    }
  }
`;

export const AgentStatusBar: React.FC<{
  agentStatus: { [k in SimplifiedAgentStatus]: number };
}> = ({ agentStatus }) => {
  const palette = useMemo(() => {
    return AGENT_STATUSES.reduce((acc, status) => {
      const previousStop = acc.length > 0 ? acc[acc.length - 1].stop : 0;
      acc.push({
        stop: previousStop + (agentStatus[status] || 0),
        color: getColorForAgentStatus(status),
      });
      return acc;
    }, [] as Array<{ stop: number; color: string }>);
  }, [agentStatus]);
  return (
    <>
      <StyledEuiColorPaletteDisplay
        className="ingest-agent-status-bar"
        size="s"
        palette={palette}
      />
    </>
  );
};
