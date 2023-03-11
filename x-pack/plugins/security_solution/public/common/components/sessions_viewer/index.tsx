/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect } from 'react';
import type { Filter } from '@kbn/es-query';
import { ENTRY_SESSION_ENTITY_ID_PROPERTY, EventAction } from '@kbn/session-view-plugin/public';
import { useDispatch } from 'react-redux';
import { EVENT_ACTION } from '@kbn/rule-data-utils';
import { TableId } from '../../../../common/types';
import { useAddBulkToTimelineAction } from '../../../detections/components/alerts_table/timeline_actions/use_add_bulk_to_timeline';
import type { SessionsComponentsProps } from './types';
import type { ESBoolQuery } from '../../../../common/typed_json';
import { StatefulEventsViewer } from '../events_viewer';
import { getSessionsDefaultModel, sessionsHeaders } from './default_headers';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import * as i18n from './translations';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { useLicense } from '../../hooks/use_license';
import { dataTableActions } from '../../store/data_table';
import { eventsDefaultModel } from '../events_viewer/default_model';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import type { BulkActionsProp } from '../toolbar/bulk_actions/types';

export const TEST_ID = 'security_solution:sessions_viewer:sessions_view';

export const defaultSessionsFilter: Required<Pick<Filter, 'meta' | 'query'>> = {
  query: {
    bool: {
      filter: [
        {
          bool: {
            // show sessions table results by filtering events where event.action is fork, exec, or end
            should: [
              { term: { [EVENT_ACTION]: EventAction.exec } },
              { term: { [EVENT_ACTION]: EventAction.fork } },
              { term: { [EVENT_ACTION]: EventAction.end } },
            ],
          },
        },
        {
          bool: {
            filter: {
              exists: {
                field: ENTRY_SESSION_ENTITY_ID_PROPERTY, // to exclude any records which have no entry_leader.entity_id
              },
            },
          },
        },
      ],
    },
  },
  meta: {
    alias: null,
    disabled: false,
    key: ENTRY_SESSION_ENTITY_ID_PROPERTY,
    negate: false,
    params: {},
    type: 'string',
  },
};

const SessionsViewComponent: React.FC<SessionsComponentsProps> = ({
  tableId,
  endDate,
  entityType = 'sessions',
  pageFilters,
  startDate,
  filterQuery,
  columns = sessionsHeaders,
  defaultColumns = sessionsHeaders,
}) => {
  const dispatch = useDispatch();
  const tGridEnabled = useIsExperimentalFeatureEnabled('tGridEnabled');
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

  useEffect(() => {
    dispatch(
      dataTableActions.initializeDataTableSettings({
        id: tableId,
        title: i18n.SESSIONS_TITLE,
        defaultColumns: eventsDefaultModel.columns.map((c) =>
          !tGridEnabled && c.initialWidth == null
            ? {
                ...c,
                initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
              }
            : c
        ),
        showCheckboxes: true,
        selectAll: true,
      })
    );
  }, [dispatch, tGridEnabled, tableId]);

  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT =
    isEnterprisePlus || tableId === TableId.kubernetesPageSessions ? 5 : 4;
  const leadingControlColumns = useMemo(
    () => getDefaultControlColumn(ACTION_BUTTON_COUNT),
    [ACTION_BUTTON_COUNT]
  );

  const addBulkToTimelineAction = useAddBulkToTimelineAction({
    localFilters: sessionsFilter,
    tableId,
    from: startDate,
    to: endDate,
    scopeId: SourcererScopeName.default,
  });

  const bulkActions = useMemo<BulkActionsProp | boolean>(() => {
    return {
      alertStatusActions: false,
      customBulkActions: [addBulkToTimelineAction],
    } as BulkActionsProp;
  }, [addBulkToTimelineAction]);

  const unit = (c: number) =>
    c > 1 ? i18n.TOTAL_COUNT_OF_SESSIONS : i18n.SINGLE_COUNT_OF_SESSIONS;

  return (
    <div data-test-subj={TEST_ID}>
      <StatefulEventsViewer
        pageFilters={sessionsFilter}
        defaultModel={getSessionsDefaultModel(columns, defaultColumns)}
        end={endDate}
        bulkActions={bulkActions}
        entityType={entityType}
        tableId={tableId}
        leadingControlColumns={leadingControlColumns}
        renderCellValue={DefaultCellRenderer}
        rowRenderers={defaultRowRenderers}
        sourcererScope={SourcererScopeName.default}
        start={startDate}
        unit={unit}
      />
    </div>
  );
};

SessionsViewComponent.displayName = 'SessionsViewComponent';

export const SessionsView = React.memo(SessionsViewComponent);
