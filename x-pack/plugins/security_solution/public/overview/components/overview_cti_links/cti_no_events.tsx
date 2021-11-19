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
  integrations,
}: {
  to: string;
  from: string;
  isSomeIntegrationsDisabled: boolean;
  integrations: Integration[];
}) => {
  const { listItems } = useCtiDashboardLinks({ to, from, integrations });

  return (
    <ThreatIntelPanelView
      listItems={listItems}
      splitPanel={warning}
      isSomeIntegrationsDisabled={isSomeIntegrationsDisabled}
    />
  );
};

export const CtiNoEvents = React.memo(CtiNoEventsComponent);
CtiNoEvents.displayName = 'CtiNoEvents';
