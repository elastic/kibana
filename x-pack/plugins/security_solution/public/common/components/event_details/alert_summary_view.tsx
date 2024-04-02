/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import type { BrowserFields } from '../../../../common/search_strategy/index_fields';
import { getSummaryRows } from './get_alert_summary_rows';
import { SummaryView } from './summary_view';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';

const AlertSummaryViewComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  isDraggable?: boolean;
  scopeId: string;
  title: string;
  goToTable: () => void;
  isReadOnly?: boolean;
  investigationFields?: string[];
}> = ({
  browserFields,
  data,
  eventId,
  isDraggable,
  scopeId,
  title,
  goToTable,
  isReadOnly,
  investigationFields,
}) => {
  const summaryRows = useMemo(
    () =>
      getSummaryRows({
        browserFields,
        data,
        eventId,
        isDraggable,
        scopeId,
        isReadOnly,
        investigationFields,
      }),
    [browserFields, data, eventId, isDraggable, scopeId, isReadOnly, investigationFields]
  );

  return (
    <SummaryView goToTable={goToTable} isReadOnly={isReadOnly} rows={summaryRows} title={title} />
  );
};

export const AlertSummaryView = React.memo(AlertSummaryViewComponent);
