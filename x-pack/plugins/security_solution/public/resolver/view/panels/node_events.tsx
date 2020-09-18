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
import { PanelLoading } from './panel_loading';
import { useLinkProps } from '../use_link_props';

export function NodeEvents({ nodeID }: { nodeID: string }) {
  const processEvent = useSelector((state: ResolverState) =>
    selectors.processEventForID(state)(nodeID)
  );
  const relatedEventsStats = useSelector((state: ResolverState) =>
    selectors.relatedEventsStats(state)(nodeID)
  );
  if (processEvent === null || relatedEventsStats === undefined) {
    return (
      <StyledPanel>
        <PanelLoading />
      </StyledPanel>
    );
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

  const processName = processEvent && event.processName(processEvent);
  const processEntityId = event.entityId(processEvent);

  const eventLinkNavProps = useLinkProps({
    panelView: 'nodes',
  });

  const processDetailNavProps = useLinkProps({
    panelView: 'nodeDetail',
    panelParameters: { nodeID: processEntityId },
  });

  const nodeDetailNavProps = useLinkProps({
    panelView: 'nodeEvents',
    panelParameters: { nodeID: processEntityId },
  });
  const crumbs = useMemo(() => {
    return [
      {
        text: i18n.translate(
          'xpack.securitySolution.endpoint.resolver.panel.processEventCounts.events',
          {
            defaultMessage: 'Events',
          }
        ),
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
            values={{ totalCount: relatedStats.events.total }}
            defaultMessage="{totalCount} Events"
          />
        ),
        ...nodeDetailNavProps,
      },
    ];
  }, [relatedStats, processName, eventLinkNavProps, nodeDetailNavProps, processDetailNavProps]);
  const rows = useMemo(() => {
    return Object.entries(relatedStats.events.byCategory).map(
      ([eventType, count]): EventCountsTableView => {
        return {
          name: eventType,
          count,
        };
      }
    );
  }, [relatedStats]);

  const eventDetailNavProps = useLinkProps({
    panelView: 'eventDetail',
    panelParameters: { nodeID: processEntityId, eventType: name, eventID: processEntityId },
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
