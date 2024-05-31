/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReportAttackDiscoveriesGeneratedParams } from '../../../common/lib/telemetry/events/attack_discovery/types';
import { useKibana } from '../../../common/lib/kibana';

interface AttackDiscoveryTelemetry {
  reportAttackDiscoveriesGenerated: (params: ReportAttackDiscoveriesGeneratedParams) => void;
}

export const useAttackDiscoveryTelemetry = (): AttackDiscoveryTelemetry => {
  const {
    services: { telemetry },
  } = useKibana();

  return {
    reportAttackDiscoveriesGenerated: telemetry.reportAttackDiscoveriesGenerated,
  };
};
