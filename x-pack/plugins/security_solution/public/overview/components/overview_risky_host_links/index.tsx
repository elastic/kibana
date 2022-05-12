/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { RiskyHostsEnabledModule } from './risky_hosts_enabled_module';
import { RiskyHostsDisabledModule } from './risky_hosts_disabled_module';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { useHostRiskScore, HostRiskScoreQueryId } from '../../../risk_score/containers';
export interface RiskyHostLinksProps extends Pick<GlobalTimeArgs, 'deleteQuery' | 'setQuery'> {
  timerange: { to: string; from: string };
}

const QUERY_ID = HostRiskScoreQueryId.OVERVIEW_RISKY_HOSTS;

const RiskyHostLinksComponent: React.FC<RiskyHostLinksProps> = ({
  timerange,
  deleteQuery,
  setQuery,
}) => {
  const [loading, { data, isModuleEnabled, inspect, refetch }] = useHostRiskScore({
    timerange,
  });

  useQueryInspector({
    queryId: QUERY_ID,
    loading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  switch (isModuleEnabled) {
    case true:
      return (
        <RiskyHostsEnabledModule to={timerange.to} from={timerange.from} hostRiskScore={data} />
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
