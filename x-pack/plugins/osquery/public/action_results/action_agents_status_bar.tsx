/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiColorPaletteDisplay } from '@elastic/eui';
import React, { useMemo } from 'react';

import { AGENT_STATUSES, getColorForAgentStatus } from './services/agent_status';
import type { ActionAgentStatus } from './types';

const euiColorPaletteDisplayCss = {
  border: 'none',
  borderRadius: 0,
  '&:after': {
    border: 'none',
  },
};

export const AgentStatusBar: React.FC<{
  agentStatus: { [k in ActionAgentStatus]: number };
}> = ({ agentStatus }) => {
  const palette = useMemo(() => {
    let stop = 0;

    return AGENT_STATUSES.reduce((acc, status) => {
      stop += agentStatus[status] || 0;
      acc.push({
        stop,
        color: getColorForAgentStatus(status),
      });

      return acc;
    }, [] as Array<{ stop: number; color: string }>);
  }, [agentStatus]);

  return <EuiColorPaletteDisplay css={euiColorPaletteDisplayCss} size="s" palette={palette} />;
};
