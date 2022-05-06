/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { RiskyHostsPanelView } from './risky_hosts_panel_view';
import { LinkPanelListItem } from '../link_panel';
import { useRiskyHostsDashboardLinks } from '../../containers/overview_risky_host_links/use_risky_hosts_dashboard_links';
import { HostsRiskScore } from '../../../../common/search_strategy';
import { useDashboardButtonHref } from '../../../common/hooks/use_dashboard_button_href';
import { RISKY_HOSTS_DASHBOARD_TITLE } from '../../../hosts/pages/navigation/constants';

const getListItemsFromHits = (items: HostsRiskScore[]): LinkPanelListItem[] => {
  return items.map(({ host, risk_stats: riskStats, risk: copy }) => ({
    title: host.name,
    count: riskStats.risk_score,
    copy,
    path: '',
  }));
};

const RiskyHostsEnabledModuleComponent: React.FC<{
  from: string;
  hostRiskScore?: HostsRiskScore[];
  to: string;
}> = ({ hostRiskScore, to, from }) => {
  const listItems = useMemo(() => getListItemsFromHits(hostRiskScore || []), [hostRiskScore]);
  const { buttonHref } = useDashboardButtonHref({ to, from, title: RISKY_HOSTS_DASHBOARD_TITLE });
  const { listItemsWithLinks } = useRiskyHostsDashboardLinks(to, from, listItems);

  return (
    <RiskyHostsPanelView
      buttonHref={buttonHref}
      isInspectEnabled
      listItems={listItemsWithLinks}
      totalCount={listItems.length}
    />
  );
};

export const RiskyHostsEnabledModule = React.memo(RiskyHostsEnabledModuleComponent);
RiskyHostsEnabledModule.displayName = 'RiskyHostsEnabledModule';
