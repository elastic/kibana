/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { OverviewPanel } from '../../../../common/store/flyout/model';
import { BackToAlertDetailsButton } from '../../components/back_to_alert_details';
import { HighlightedFields } from './highlighted-fields';
import { MitreDetails } from './mitre-details';
import { ReasonDetails } from './reason-details';
import { RuleDetails } from './rule-details';

// TODO: If we want the table as a panel, use the below
export const EventOverviewPanelKey: OverviewPanel['panelKind'] = 'overview';

export const EventOverviewPanel: React.FC = React.memo(() => {
  return (
    <div style={{ padding: '20px' }}>
      <BackToAlertDetailsButton />
      <MitreDetails />
      <RuleDetails />
      <EuiHorizontalRule margin="s" />
      <p>{'Session Viewer Preview Placeholder'}</p>
      <EuiSpacer />
      <ReasonDetails />
      <EuiSpacer />
      <HighlightedFields />
    </div>
  );
});

EventOverviewPanel.displayName = 'EventOverview';

// TODO: If we want the table as a tab, use the below:

export const EventOverviewTab: React.FC = React.memo(() => {
  return (
    <>
      <MitreDetails />
      <RuleDetails />
      <EuiHorizontalRule margin="l" />
      <p>{'Session Viewer Preview Placeholder'}</p>
      <EuiSpacer />
      <ReasonDetails />
      <EuiSpacer />
      <HighlightedFields />
    </>
  );
});

EventOverviewTab.displayName = 'EventOverviewTab';
