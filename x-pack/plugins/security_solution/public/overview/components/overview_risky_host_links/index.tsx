/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { RiskyHostsEnabledModule } from './risky_hosts_enabled_module';
import { RiskyHostsDisabledModule } from './risky_hosts_disabled_module';
import { useHostsRiskScore } from '../../containers/overview_risky_host_links/use_hosts_risk_score';
export interface RiskyHostLinksProps {
  timerange: { to: string; from: string };
}

const RiskyHostLinksComponent: React.FC<RiskyHostLinksProps> = ({ timerange }) => {
  const hostRiskScore = useHostsRiskScore({ timerange });

  switch (hostRiskScore?.isModuleEnabled) {
    case true:
      return (
        <RiskyHostsEnabledModule
          to={timerange.to}
          from={timerange.from}
          hostRiskScore={hostRiskScore}
        />
      );
    case false:
      return <RiskyHostsDisabledModule />;
    case undefined:
    default:
      return null;
  }
};

export const RiskyHostLinks = React.memo(RiskyHostLinksComponent);
RiskyHostLinks.displayName = 'RiskyHostLinks';
