/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useCtiDashboardLinks } from '../../containers/overview_cti_links';
import { ThreatIntelPanelView } from './threat_intel_panel_view';
import { InnerLinkPanel } from '../link_panel';
import * as i18n from './translations';
import { emptyEventCountsByDataset } from '../../containers/overview_cti_links/helpers';
import { Integration } from '../../containers/overview_cti_links/use_ti_integrations';

const warning = (
  <InnerLinkPanel
    color={'warning'}
    title={i18n.WARNING_TITLE}
    body={i18n.WARNING_BODY}
    dataTestSubj="cti-inner-panel-warning"
  />
);

export const CtiNoEventsComponent = ({
  to,
  from,
  isSomeIntegrationsDisabled,
  installedIntegrations,
}: {
  to: string;
  from: string;
  isSomeIntegrationsDisabled: boolean;
  installedIntegrations: Integration[];
}) => {
  const { listItems, isPluginDisabled } = useCtiDashboardLinks(
    emptyEventCountsByDataset,
    to,
    from,
    installedIntegrations
  );

  return (
    <ThreatIntelPanelView
      listItems={listItems}
      splitPanel={warning}
      isPluginDisabled={isPluginDisabled}
      isSomeIntegrationsDisabled={isSomeIntegrationsDisabled}
    />
  );
};

export const CtiNoEvents = React.memo(CtiNoEventsComponent);
CtiNoEvents.displayName = 'CtiNoEvents';
