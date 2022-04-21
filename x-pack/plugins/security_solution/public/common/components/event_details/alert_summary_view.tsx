/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { BrowserFields } from '../../../../common/search_strategy/index_fields';
import { SummaryView } from './summary_view';

import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';

import { getSummaryRows } from './get_alert_summary_rows';

const AlertSummaryViewComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  isDraggable?: boolean;
  timelineId: string;
  title: string;
  goToTable: () => void;
  isReadOnly?: boolean;
}> = ({ browserFields, data, eventId, isDraggable, timelineId, title, goToTable, isReadOnly }) => {
  const summaryRows = useMemo(
    () => getSummaryRows({ browserFields, data, eventId, isDraggable, timelineId, isReadOnly }),
    [browserFields, data, eventId, isDraggable, timelineId, isReadOnly]
  );

  return <SummaryView rows={summaryRows} title={title} goToTable={goToTable} />;
};

export const AlertSummaryView = React.memo(AlertSummaryViewComponent);
