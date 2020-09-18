/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTableColumn, EuiButtonEmpty, EuiSpacer, EuiInMemoryTable } from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import { useSelector } from 'react-redux';
import { Breadcrumbs } from './breadcrumbs';
import * as event from '../../../../common/endpoint/models/event';
import { ResolverEvent, ResolverNodeStats } from '../../../../common/endpoint/types';
import * as selectors from '../../store/selectors';
import { ResolverState } from '../../types';
import { StyledPanel } from '../styles';
import { useNavigateOrReplace } from '../use_navigate_or_replace';
import { PanelLoading } from './panel_loading';

export function NodeEvents({ nodeID }: { nodeID: string }) {
  const processEvent = useSelector((state: ResolverState) =>
    selectors.processEventForID(state)(nodeID)
  );
  const relatedEventsStats = useSelector((state: ResolverState) =>
    selectors.relatedEventsStats(state)(nodeID)
  );
  if (processEvent === null || relatedEventsStats === undefined) {
    return <PanelLoading />;
  } else {
    return (
      <StyledPanel>
        <EventCountsForProcess processEvent={processEvent} relatedStats={relatedEventsStats} />
      </StyledPanel>
    );
  }
}

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
const EventCountsForProcess = memo(function ({
  processEvent,
  relatedStats,
}: {
  processEvent: ResolverEvent;
  relatedStats: ResolverNodeStats;
}) {
  interface EventCountsTableView {
    name: string;
    count: number;
  }

  const relatedEventsState = { stats: relatedStats.events.byCategory };
  const processName = processEvent && event.eventName(processEvent);
  const processEntityId = event.entityId(processEvent);
  /**
   * totalCount: This will reflect the aggregated total by category for all related events
   * e.g. [dns,file],[dns,file],[registry] will have an aggregate total of 5. This is to keep the
   * total number consistent with the "broken out" totals we see elsewhere in the app.
   * E.g. on the rleated list by type, the above would show as:
   * 2 dns
   * 2 file
   * 1 registry
   * So it would be extremely disorienting to show the user a "3" above that as a total.
   */
  const totalCount = Object.values(relatedStats.events.byCategory).reduce(
    (sum, val) => sum + val,
    0
  );
  const eventsString = i18n.translate(
    'xpack.securitySolution.endpoint.resolver.panel.processEventCounts.events',
    {
      defaultMessage: 'Events',
    }
  );
  const eventsHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({ panelView: 'nodes' })
  );

  const eventLinkNavProps = useNavigateOrReplace({
    search: eventsHref,
  });

  const processDetailHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({
      panelView: 'nodeDetail',
      panelParameters: { nodeID: processEntityId },
    })
  );

  const processDetailNavProps = useNavigateOrReplace({
    search: processDetailHref,
  });

  const nodeDetailHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({
      panelView: 'nodeEvents',
      panelParameters: { nodeID: processEntityId },
    })
  );

  const nodeDetailNavProps = useNavigateOrReplace({
    search: nodeDetailHref!,
  });
  const crumbs = useMemo(() => {
    return [
      {
        text: eventsString,
        ...eventLinkNavProps,
      },
      {
        text: processName,
        ...processDetailNavProps,
      },
      {
        text: (
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedCounts.numberOfEventsInCrumb"
            values={{ totalCount }}
            defaultMessage="{totalCount} Events"
          />
        ),
        ...nodeDetailNavProps,
      },
    ];
  }, [
    processName,
    totalCount,
    eventsString,
    eventLinkNavProps,
    nodeDetailNavProps,
    processDetailNavProps,
  ]);
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

  const eventDetailHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({
      panelView: 'eventDetail',
      panelParameters: { nodeID: processEntityId, eventType: name, eventID: processEntityId },
    })
  );

  const eventDetailNavProps = useNavigateOrReplace({
    search: eventDetailHref,
  });
  const columns = useMemo<Array<EuiBasicTableColumn<EventCountsTableView>>>(
    () => [
      {
        field: 'count',
        name: i18n.translate('xpack.securitySolution.endpoint.resolver.panel.table.row.count', {
          defaultMessage: 'Count',
        }),
        width: '20%',
        sortable: true,
      },
      {
        field: 'name',
        name: i18n.translate('xpack.securitySolution.endpoint.resolver.panel.table.row.eventType', {
          defaultMessage: 'Event Type',
        }),
        width: '80%',
        sortable: true,
        render(name: string) {
          return <EuiButtonEmpty {...eventDetailNavProps}>{name}</EuiButtonEmpty>;
        },
      },
    ],
    [eventDetailNavProps]
  );
  return (
    <>
      <Breadcrumbs breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <EuiInMemoryTable<EventCountsTableView> items={rows} columns={columns} sorting />
    </>
  );
});
