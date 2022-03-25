/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { Filter } from '@kbn/es-query';
import { SessionsComponentsProps } from './types';
import { ESBoolQuery } from '../../../../common/typed_json';
import { StatefulEventsViewer } from '../events_viewer';
import { sessionsDefaultModel } from './default_headers';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import * as i18n from './translations';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';

export const TEST_ID = 'security_solution:sessions_viewer:sessions_view';

export const defaultSessionsFilter: Required<Pick<Filter, 'meta' | 'query'>> = {
  query: {
    bool: {
      filter: [
        {
          bool: {
            should: [
              {
                match: {
                  'process.is_entry_leader': true,
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ],
    },
  },
  meta: {
    alias: null,
    disabled: false,
    key: 'process.is_entry_leader',
    negate: false,
    params: {},
    type: 'boolean',
  },
};

const SessionsViewComponent: React.FC<SessionsComponentsProps> = ({
  timelineId,
  endDate,
  entityType = 'sessions',
  pageFilters,
  startDate,
  filterQuery,
}) => {
  const parsedFilterQuery: ESBoolQuery = useMemo(() => {
    if (filterQuery && filterQuery !== '') {
      return JSON.parse(filterQuery);
    }
    return {};
  }, [filterQuery]);

  const sessionsFilter = useMemo(
    () => [
      {
        ...defaultSessionsFilter,
        query: {
          ...defaultSessionsFilter.query,
          bool: {
            ...defaultSessionsFilter.query.bool,
            filter: defaultSessionsFilter.query.bool.filter.concat(parsedFilterQuery),
          },
        },
      },
      ...pageFilters,
    ],
    [pageFilters, parsedFilterQuery]
  );

  const ACTION_BUTTON_COUNT = 5;
  const leadingControlColumns = useMemo(() => getDefaultControlColumn(ACTION_BUTTON_COUNT), []);

  const unit = (c: number) =>
    c > 1 ? i18n.TOTAL_COUNT_OF_SESSIONS : i18n.SINGLE_COUNT_OF_SESSIONS;

  return (
    <div data-test-subj={TEST_ID}>
      <StatefulEventsViewer
        pageFilters={sessionsFilter}
        defaultModel={sessionsDefaultModel}
        end={endDate}
        entityType={entityType}
        id={timelineId}
        leadingControlColumns={leadingControlColumns}
        renderCellValue={DefaultCellRenderer}
        rowRenderers={defaultRowRenderers}
        scopeId={SourcererScopeName.default}
        start={startDate}
        unit={unit}
      />
    </div>
  );
};

SessionsViewComponent.displayName = 'SessionsViewComponent';

export const SessionsView = React.memo(SessionsViewComponent);
