/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiButtonEmpty, EuiSpacer, EuiInMemoryTable, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSelector } from 'react-redux';
import { FormattedCount } from '../../../common/components/formatted_number';
import { Breadcrumbs } from './breadcrumbs';
import * as event from '../../../../common/endpoint/models/event';
import type { EventStats } from '../../../../common/endpoint/types';
import * as selectors from '../../store/selectors';
import { PanelLoading } from './panel_loading';
import { useLinkProps } from '../use_link_props';
import * as nodeDataModel from '../../models/node_data';
import type { State } from '../../../common/store/types';

export function NodeEvents({ id, nodeID }: { id: string; nodeID: string }) {
  const processEvent = useSelector((state: State) =>
    nodeDataModel.firstEvent(selectors.nodeDataForID(state.analyzer[id])(nodeID))
  );
  const nodeStats = useSelector((state: State) => selectors.nodeStats(state.analyzer[id])(nodeID));

  if (processEvent === undefined || nodeStats === undefined) {
    return <PanelLoading id={id} />;
  } else {
    return (
      <>
        <NodeEventsBreadcrumbs
          id={id}
          nodeName={event.processNameSafeVersion(processEvent)}
          nodeID={nodeID}
          totalEventCount={nodeStats.total}
        />
        <EuiSpacer size="l" />
        <EventCategoryLinks id={id} nodeID={nodeID} relatedStats={nodeStats} />
      </>
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
// eslint-disable-next-line react/display-name
const EventCategoryLinks = memo(function ({
  id,
  nodeID,
  relatedStats,
}: {
  id: string;
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
        width: '25%',
        sortable: true,
        render(count: number) {
          return (
            <EuiToolTip position="top" content={count}>
              <FormattedCount count={count} />
            </EuiToolTip>
          );
        },
      },
      {
        field: 'eventType',
        name: i18n.translate('xpack.securitySolution.endpoint.resolver.panel.table.row.eventType', {
          defaultMessage: 'Event Type',
        }),
        width: '75%',
        sortable: true,
        render(eventType: string) {
          return (
            <NodeEventsLink id={id} nodeID={nodeID} eventType={eventType}>
              {eventType}
            </NodeEventsLink>
          );
        },
      },
    ],
    [nodeID, id]
  );
  return <EuiInMemoryTable<EventCountsTableView> items={rows} columns={columns} sorting />;
});

// eslint-disable-next-line react/display-name
const NodeEventsBreadcrumbs = memo(function ({
  id,
  nodeID,
  nodeName,
  totalEventCount,
}: {
  id: string;
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
          ...useLinkProps(id, {
            panelView: 'nodes',
          }),
        },
        {
          text: nodeName,
          ...useLinkProps(id, {
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
          ...useLinkProps(id, {
            panelView: 'nodeEvents',
            panelParameters: { nodeID },
          }),
        },
      ]}
    />
  );
});

// eslint-disable-next-line react/display-name
const NodeEventsLink = memo(
  ({
    id,
    nodeID,
    eventType,
    children,
  }: {
    id: string;
    nodeID: string;
    eventType: string;
    children: React.ReactNode;
  }) => {
    const props = useLinkProps(id, {
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
