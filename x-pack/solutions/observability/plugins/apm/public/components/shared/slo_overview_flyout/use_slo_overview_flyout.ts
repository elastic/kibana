/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentName } from '@kbn/elastic-agent-utils';
import { useCallback, useState } from 'react';

type SloOverviewFlyoutState = {
  serviceName: string;
  agentName?: AgentName;
} | null;

interface SloOverviewFlyoutReturn {
  sloOverviewFlyout: SloOverviewFlyoutState;
  openSloOverviewFlyout: (serviceName: string, agentName?: AgentName) => void;
  closeSloOverviewFlyout: () => void;
}

export function useSloOverviewFlyout(
  initialState: SloOverviewFlyoutState = null
): SloOverviewFlyoutReturn {
  const [sloOverviewFlyout, setSloOverviewFlyout] = useState<SloOverviewFlyoutState>(initialState);

  const openSloOverviewFlyout = useCallback((serviceName: string, agentName?: AgentName) => {
    setSloOverviewFlyout({ serviceName, agentName });
  }, []);

  const closeSloOverviewFlyout = useCallback(() => {
    setSloOverviewFlyout(null);
  }, []);

  return {
    sloOverviewFlyout,
    openSloOverviewFlyout,
    closeSloOverviewFlyout,
  };
}
