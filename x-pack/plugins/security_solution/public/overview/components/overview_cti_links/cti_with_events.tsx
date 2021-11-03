/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEqual } from 'lodash';
import { useCtiDashboardLinks } from '../../containers/overview_cti_links';
import { ThreatIntelPanelView } from './threat_intel_panel_view';

export const CtiWithEventsComponent = ({
  eventCountsByDataset,
  from,
  to,
  totalCount,
}: {
  eventCountsByDataset: { [key: string]: number };
  from: string;
  to: string;
  totalCount: number;
}) => {
  const { buttonHref, isPluginDisabled, listItems } = useCtiDashboardLinks(
    eventCountsByDataset,
    to,
    from
  );

  return (
    <ThreatIntelPanelView
      buttonHref={buttonHref}
      isPluginDisabled={isPluginDisabled}
      listItems={listItems}
      totalCount={totalCount}
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
    isEqual(prevProps.eventCountsByDataset, nextProps.eventCountsByDataset)
);
