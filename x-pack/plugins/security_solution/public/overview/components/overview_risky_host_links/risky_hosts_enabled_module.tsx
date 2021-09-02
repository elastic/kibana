/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RiskyHostsPanelView } from './risky_hosts_panel_view';
import { LinkPanelListItem } from '../link_panel';
import { useRiskyHostsDashboardButtonHref } from '../../containers/overview_risky_host_links/use_risky_hosts_dashboard_button_href';
import { useRiskyHostsDashboardLinks } from '../../containers/overview_risky_host_links/use_risky_hosts_dashboard_links';

const RiskyHostsEnabledModuleComponent: React.FC<{
  from: string;
  listItems: LinkPanelListItem[];
  to: string;
}> = ({ listItems, to, from }) => {
  const { buttonHref } = useRiskyHostsDashboardButtonHref(to, from);
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
