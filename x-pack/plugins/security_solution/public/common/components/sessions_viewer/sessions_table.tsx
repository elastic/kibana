/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { Filter } from '@kbn/es-query';
import { ESBoolQuery } from '../../../../common/typed_json';
import { TimelineIdLiteral } from '../../../../common/types/timeline';
import { StatefulEventsViewer } from '../events_viewer';
import { sessionsDefaultModel } from './default_headers';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import * as i18n from './translations';
import { SourcererScopeName } from '../../store/sourcerer/model';
import type { EntityType } from '../../../../../timelines/common';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';

const defaultSessionsFilter: Required<Pick<Filter, 'meta' | 'query'>> = {
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

interface Props {
  timelineId: TimelineIdLiteral;
  endDate: string;
  entityType?: EntityType;
  startDate: string;
  pageFilters?: Filter[];
  filterQuery?: string;
}

const SessionsTableComponent: React.FC<Props> = ({
  timelineId,
  endDate,
  entityType = 'sessions',
  startDate,
  pageFilters = [],
  filterQuery = '',
}) => {
  // TODO: Check for a better way to handle filterQuery, this is essentially to filter the host name when on the host details page
  const parsedFilterQuery = useMemo(() => {
    if (filterQuery && filterQuery !== '') {
      return JSON.parse(filterQuery) as unknown as ESBoolQuery;
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
  );
};

export const SessionsTable = React.memo(SessionsTableComponent);
