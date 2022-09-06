/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { Filter } from '@kbn/es-query';
import { StatefulEventsViewer } from '../common/components/events_viewer';
import { eventsDefaultModel } from '../common/components/events_viewer/default_model';
import { defaultRowRenderers } from '../timelines/components/timeline/body/renderers';
import { DefaultCellRenderer } from '../timelines/components/timeline/cell_rendering/default_cell_renderer';
import { SourcererScopeName } from '../common/store/sourcerer/model';
import { getDefaultControlColumn } from '../timelines/components/timeline/body/control_columns';

export const TEST_ID = 'security_solution:sessions_viewer:sessions_view';

export const defaultSessionsFilter: Required<Pick<Filter, 'meta' | 'query'>> = {
  query: {
    bool: {
      filter: [
        {
          term: { 'event.category': 'threat' },
        },
        {
          term: { 'event.type': 'indicator' },
        },
      ],
    },
  },
  meta: {
    alias: null,
    disabled: false,
    key: 'threats',
    negate: false,
    params: {},
    type: 'boolean',
  },
};

const TGridDemoComponent: React.FC<any> = ({
  timelineId = 'threat-feed',
  endDate,
  entityType = 'threats',
  pageFilters = [],
  startDate,
  filterQuery,
}) => {
  const ACTION_BUTTON_COUNT = 5;
  const leadingControlColumns = useMemo(() => getDefaultControlColumn(ACTION_BUTTON_COUNT), []);

  const unit = (c: number) => (c > 1 ? 'threats' : 'threat');
  const filters = [defaultSessionsFilter];
  return (
    <div data-test-subj={TEST_ID}>
      <StatefulEventsViewer
        pageFilters={filters}
        defaultModel={eventsDefaultModel}
        end={'2022-09-07T03:59:59.999Z'}
        entityType={entityType}
        id={timelineId}
        leadingControlColumns={leadingControlColumns}
        renderCellValue={DefaultCellRenderer}
        rowRenderers={defaultRowRenderers}
        scopeId={SourcererScopeName.default}
        start={'2022-06-08T17:39:56.490Z'}
        unit={unit}
      />
    </div>
  );
};

TGridDemoComponent.displayName = 'TGridDemo';

export const TGridDemo = React.memo(TGridDemoComponent);
