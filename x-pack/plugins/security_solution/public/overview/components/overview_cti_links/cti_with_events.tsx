/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEqual } from 'lodash';
import { useCtiDashboardLinks } from '../../containers/overview_cti_links';
import { Integration } from '../../containers/overview_cti_links/use_ti_integrations';
import { ThreatIntelPanelView } from './threat_intel_panel_view';

export const CtiWithEventsComponent = ({
  from,
  to,
  totalCount,
  isSomeIntegrationsDisabled,
  integrations,
}: {
  from: string;
  to: string;
  totalCount: number;
  isSomeIntegrationsDisabled: boolean;
  integrations: Integration[];
}) => {
  const { listItems } = useCtiDashboardLinks({ to, from, integrations });

  return (
    <ThreatIntelPanelView
      listItems={listItems}
      totalCount={totalCount}
      isSomeIntegrationsDisabled={isSomeIntegrationsDisabled}
    />
  );
};

CtiWithEventsComponent.displayName = 'CtiWithEvents';

export const CtiWithEvents = React.memo(
  CtiWithEventsComponent,
  (prevProps, nextProps) =>
    prevProps.to === nextProps.to &&
    prevProps.from === nextProps.from &&
    prevProps.totalCount === nextProps.totalCount &&
    isEqual(prevProps.integrations, nextProps.integrations)
);
