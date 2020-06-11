/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiI18nNumber,
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiSpacer,
  EuiInMemoryTable,
} from '@elastic/eui';
import { CrumbInfo, StyledBreadcrumbs } from '../panel';
import { RelatedEventDataEntryWithStats } from '../../types';
import * as event from '../../../../common/endpoint/models/event';
import { ResolverEvent } from '../../../../common/endpoint/types';

/**
 * This view gives counts for all the related events of a process grouped by related event type.
 * It should look something like:
 *
 * | Count                  | Event Type                 |
 * | :--------------------- | :------------------------- |
 * | 5                      | DNS                        |
 * | 12                     | Registry                   |
 * | 2                      | Network                    |
 *
 */
export const EventCountsForProcess = memo(function EventCountsForProcess({
  processEvent,
  pushToQueryParams,
  relatedEventsState,
}: {
  processEvent: ResolverEvent;
  pushToQueryParams: (arg0: CrumbInfo) => unknown;
  relatedEventsState: RelatedEventDataEntryWithStats;
}) {
  interface EventCountsTableView {
    name: string;
    count: number;
  }

  const processName = processEvent && event.eventName(processEvent);
  const processEntityId = event.entityId(processEvent);
  const totalCount = Object.values(relatedEventsState.stats).reduce((a, v) => {
    return a + v;
  }, 0);
  const eventsString = i18n.translate(
    'xpack.siem.endpoint.resolver.panel.processEventCounts.events',
    {
      defaultMessage: 'Events',
    }
  );
  const crumbs = useMemo(() => {
    return [
      {
        text: eventsString,
        onClick: () => {
          pushToQueryParams({ crumbId: '', crumbEvent: '' });
        },
      },
      {
        text: processName,
        onClick: () => {
          pushToQueryParams({ crumbId: processEntityId, crumbEvent: '' });
        },
      },
      {
        text: (
          <>
            <EuiI18nNumber value={totalCount} />
            {/* Non-breaking space->*/ ` ${eventsString}`}
          </>
        ),
        onClick: () => {
          pushToQueryParams({ crumbId: processEntityId, crumbEvent: '' });
        },
      },
    ];
  }, [processName, totalCount, processEntityId]);
  const rows = useMemo(() => {
    return Object.entries(relatedEventsState.stats).map(
      ([eventType, count]): EventCountsTableView => {
        return {
          name: eventType,
          count,
        };
      }
    );
  }, [relatedEventsState]);
  const columns = useMemo<Array<EuiBasicTableColumn<EventCountsTableView>>>(
    () => [
      {
        field: 'count',
        name: i18n.translate('xpack.siem.endpoint.resolver.panel.table.row.count', {
          defaultMessage: 'Count',
        }),
        width: '20%',
        sortable: true,
      },
      {
        field: 'name',
        name: i18n.translate('xpack.siem.endpoint.resolver.panel.table.row.eventType', {
          defaultMessage: 'Event Type',
        }),
        width: '80%',
        sortable: true,
        render(name: string) {
          return (
            <EuiButtonEmpty
              onClick={() => {
                pushToQueryParams({ crumbId: event.entityId(processEvent), crumbEvent: name });
              }}
            >
              {name}
            </EuiButtonEmpty>
          );
        },
      },
    ],
    [relatedEventsState, pushToQueryParams]
  );
  return (
    <>
      <StyledBreadcrumbs breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <EuiInMemoryTable<EventCountsTableView> items={rows} columns={columns} sorting />
    </>
  );
});
EventCountsForProcess.displayName = 'EventCountsForProcess';
