/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTableColumn, EuiButtonEmpty, EuiSpacer, EuiInMemoryTable } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSelector } from 'react-redux';
import { Breadcrumbs } from './breadcrumbs';
import * as event from '../../../../common/endpoint/models/event';
import { EventStats } from '../../../../common/endpoint/types';
import * as selectors from '../../store/selectors';
import { ResolverState } from '../../types';
import { StyledPanel } from '../styles';
import { PanelLoading } from './panel_loading';
import { useLinkProps } from '../use_link_props';
import * as nodeDataModel from '../../models/node_data';

export function NodeEvents({ nodeID }: { nodeID: string }) {
  const processEvent = useSelector((state: ResolverState) =>
    nodeDataModel.firstEvent(selectors.nodeDataForID(state)(nodeID))
  );
  const nodeStats = useSelector((state: ResolverState) => selectors.nodeStats(state)(nodeID));

  if (processEvent === undefined || nodeStats === undefined) {
    return (
      <StyledPanel hasBorder>
        <PanelLoading />
      </StyledPanel>
    );
  } else {
    return (
      <StyledPanel hasBorder>
        <NodeEventsBreadcrumbs
          nodeName={event.processNameSafeVersion(processEvent)}
          nodeID={nodeID}
          totalEventCount={nodeStats.total}
        />
        <EuiSpacer size="l" />
        <EventCategoryLinks nodeID={nodeID} relatedStats={nodeStats} />
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
const EventCategoryLinks = memo(function ({
  nodeID,
  relatedStats,
}: {
  nodeID: string;
  relatedStats: EventStats;
}) {
  interface EventCountsTableView {
    eventType: string;
    count: number;
  }

  const rows = useMemo(() => {
    return Object.entries(relatedStats.byCategory).map(
      ([eventType, count]): EventCountsTableView => {
        return {
          eventType,
          count,
        };
      }
    );
  }, [relatedStats.byCategory]);

  const columns = useMemo<Array<EuiBasicTableColumn<EventCountsTableView>>>(
    () => [
      {
        field: 'count',
        name: i18n.translate('xpack.securitySolution.endpoint.resolver.panel.table.row.count', {
          defaultMessage: 'Count',
        }),
        'data-test-subj': 'resolver:panel:node-events:event-type-count',
        width: '20%',
        sortable: true,
      },
      {
        field: 'eventType',
        name: i18n.translate('xpack.securitySolution.endpoint.resolver.panel.table.row.eventType', {
          defaultMessage: 'Event Type',
        }),
        width: '80%',
        sortable: true,
        render(eventType: string) {
          return (
            <NodeEventsLink nodeID={nodeID} eventType={eventType}>
              {eventType}
            </NodeEventsLink>
          );
        },
      },
    ],
    [nodeID]
  );
  return <EuiInMemoryTable<EventCountsTableView> items={rows} columns={columns} sorting />;
});

const NodeEventsBreadcrumbs = memo(function ({
  nodeID,
  nodeName,
  totalEventCount,
}: {
  nodeID: string;
  nodeName: React.ReactNode;
  totalEventCount: number;
}) {
  return (
    <Breadcrumbs
      breadcrumbs={[
        {
          text: i18n.translate(
            'xpack.securitySolution.endpoint.resolver.panel.processEventCounts.events',
            {
              defaultMessage: 'Events',
            }
          ),
          ...useLinkProps({
            panelView: 'nodes',
          }),
        },
        {
          text: nodeName,
          ...useLinkProps({
            panelView: 'nodeDetail',
            panelParameters: { nodeID },
          }),
        },
        {
          text: (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.resolver.panel.relatedCounts.numberOfEventsInCrumb"
              values={{ totalCount: totalEventCount }}
              defaultMessage="{totalCount} Events"
            />
          ),
          ...useLinkProps({
            panelView: 'nodeEvents',
            panelParameters: { nodeID },
          }),
        },
      ]}
    />
  );
});

const NodeEventsLink = memo(
  ({
    nodeID,
    eventType,
    children,
  }: {
    nodeID: string;
    eventType: string;
    children: React.ReactNode;
  }) => {
    const props = useLinkProps({
      panelView: 'nodeEventsInCategory',
      panelParameters: {
        nodeID,
        eventCategory: eventType,
      },
    });
    return (
      <EuiButtonEmpty data-test-subj="resolver:panel:node-events:event-type-link" {...props}>
        {children}
      </EuiButtonEmpty>
    );
  }
);
