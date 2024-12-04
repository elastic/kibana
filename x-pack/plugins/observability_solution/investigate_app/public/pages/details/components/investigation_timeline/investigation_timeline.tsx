/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import React, { useState } from 'react';
import { useInvestigation } from '../../contexts/investigation_context';
import { EventsTimeline } from '../events_timeline/events_timeline';
import { InvestigationSearchBar } from '../investigation_search_bar/investigation_search_bar';

export function InvestigationTimeline() {
  const { globalParams, updateInvestigationParams } = useInvestigation();
  const [eventTypes, setEventTypes] = useState<string[]>([]);

  return (
    <EuiPanel hasBorder={true} grow={false} paddingSize="xs">
      <EuiFlexGroup direction="column" gutterSize="s" responsive>
        <InvestigationSearchBar
          onEventTypesSelected={(selected: string[]) => setEventTypes(selected)}
          dateRangeFrom={globalParams.timeRange.from}
          dateRangeTo={globalParams.timeRange.to}
          onQuerySubmit={async ({ dateRange }) => {
            const nextTimeRange = {
              from: datemath.parse(dateRange.from)!.toISOString(),
              to: datemath.parse(dateRange.to)!.toISOString(),
            };

            updateInvestigationParams({ timeRange: nextTimeRange });
          }}
        />

        <EventsTimeline eventTypes={eventTypes} />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
