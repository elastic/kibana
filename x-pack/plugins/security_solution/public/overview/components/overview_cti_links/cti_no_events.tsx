/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useCtiDashboardLinks } from '../../containers/overview_cti_links';
import { ThreatIntelPanelView } from './threat_intel_panel_view';
import { CtiInnerPanel } from './cti_inner_panel';
import * as i18n from './translations';
import { emptyEventCountsByDataset } from '../../containers/overview_cti_links/helpers';

const warning = (
  <CtiInnerPanel
    color={'warning'}
    title={i18n.WARNING_TITLE}
    body={i18n.WARNING_BODY}
    dataTestSubj="cti-inner-panel-warning"
  />
);

export const CtiNoEventsComponent = ({ to, from }: { to: string; from: string }) => {
  const { buttonHref, listItems, isDashboardPluginDisabled } = useCtiDashboardLinks(
    emptyEventCountsByDataset,
    to,
    from
  );

  return (
    <ThreatIntelPanelView
      buttonHref={buttonHref}
      listItems={listItems}
      splitPanel={warning}
      totalEventCount={0}
      isDashboardPluginDisabled={isDashboardPluginDisabled}
    />
  );
};

CtiNoEventsComponent.displayName = 'CtiNoEvents';

export const CtiNoEvents = React.memo(CtiNoEventsComponent);
