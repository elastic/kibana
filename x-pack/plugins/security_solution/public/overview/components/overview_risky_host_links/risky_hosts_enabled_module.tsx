/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { RiskyHostsPanelView } from './risky_hosts_panel_view';
import type { LinkPanelListItem } from '../link_panel';
import { useRiskyHostsDashboardLinks } from '../../containers/overview_risky_host_links/use_risky_hosts_dashboard_links';
import type { HostRiskScore } from '../../../../common/search_strategy';

const getListItemsFromHits = (items: HostRiskScore[]): LinkPanelListItem[] => {
  return items.map(({ host }) => ({
    title: host.name,
    count: host.risk.calculated_score_norm,
    copy: host.risk.calculated_level,
    path: '',
  }));
};

const RiskyHostsEnabledModuleComponent: React.FC<{
  from: string;
  hostRiskScore?: HostRiskScore[];
  to: string;
}> = ({ hostRiskScore, to, from }) => {
  const listItems = useMemo(() => getListItemsFromHits(hostRiskScore || []), [hostRiskScore]);
  const { listItemsWithLinks } = useRiskyHostsDashboardLinks(to, from, listItems);

  return (
    <RiskyHostsPanelView
      isInspectEnabled
      listItems={listItemsWithLinks}
      totalCount={listItems.length}
      to={to}
      from={from}
    />
  );
};

export const RiskyHostsEnabledModule = React.memo(RiskyHostsEnabledModuleComponent);
RiskyHostsEnabledModule.displayName = 'RiskyHostsEnabledModule';
