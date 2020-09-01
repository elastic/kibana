/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo, useContext, useLayoutEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { EuiPanel } from '@elastic/eui';
import * as selectors from '../../store/selectors';
import { useResolverDispatch } from '../use_resolver_dispatch';
import * as event from '../../../../common/endpoint/models/event';
import { ResolverEvent, ResolverNodeStats } from '../../../../common/endpoint/types';
import { SideEffectContext } from '../side_effect_context';
import { ProcessEventList } from './process_event_list';
import { EventCountsForProcess } from './event_counts_for_process';
import { ProcessDetails } from './process_details';
import { ProcessListWithCounts } from './process_list_with_counts';
import { RelatedEventDetail } from './related_event_detail';

/**
 * The team decided to use this table to determine which breadcrumbs/view to display:
 *
 * | Crumb/Table            | &crumbId                   | &crumbEvent              |
 * | :--------------------- | :------------------------- | :----------------------  |
 * | all processes/default  | null                       | null                     |
 * | process detail         | entity_id of process       | null                     |
 * | relateds count by type | entity_id of process       | 'all'                    |
 * | relateds list 1 type   | entity_id of process       | valid related event type |
 * | related event detail   | event_id of related event  | entity_id of process     |
 *
 * This component implements the strategy laid out above by determining the "right" view and doing some other housekeeping e.g. effects to keep the UI-selected node in line with what's indicated by the URL parameters.
 *
 * @returns {JSX.Element} The "right" table content to show based on the query params as described above
 */
const PanelContent = memo(function PanelContent() {
  const dispatch = useResolverDispatch();

  const { timestamp } = useContext(SideEffectContext);

  const queryParams = useSelector(selectors.breadcrumbParameters);

  const graphableProcesses = useSelector(selectors.graphableProcesses);
  const graphableProcessEntityIds = useMemo(() => {
    return new Set(graphableProcesses.map(event.entityId));
  }, [graphableProcesses]);
  // The entity id in query params of a graphable process (or false if none is found)
  // For 1 case (the related detail, see below), the process id will be in crumbEvent instead of crumbId
  const idFromParams = useMemo(() => {
    if (graphableProcessEntityIds.has(queryParams.crumbId)) {
      return queryParams.crumbId;
    }
    if (graphableProcessEntityIds.has(queryParams.crumbEvent)) {
      return queryParams.crumbEvent;
    }
    return '';
  }, [queryParams, graphableProcessEntityIds]);

  // The "selected" node (and its corresponding event) in the tree control.
  // It may need to be synchronized with the ID indicated as selected via the `idFromParams`
  // memo above. When this is the case, it is handled by the layout effect below.
  const selectedNode = useSelector(selectors.selectedNode);
  const uiSelectedEvent = useMemo(() => {
    return graphableProcesses.find((evt) => event.entityId(evt) === selectedNode);
  }, [graphableProcesses, selectedNode]);

  // Until an event is dispatched during update, the event indicated as selected by params may
  // be different than the one in state.
  const paramsSelectedEvent = useMemo(() => {
    return graphableProcesses.find((evt) => event.entityId(evt) === idFromParams);
  }, [graphableProcesses, idFromParams]);

  const [lastUpdatedProcess, setLastUpdatedProcess] = useState<null | ResolverEvent>(null);

  /**
   * When the ui-selected node is _not_ the one indicated by the query params, but the id from params _is_ in the current tree,
   * dispatch a selection action to amend the UI state to hold the query id as "selected".
   * This is to cover cases where users e.g. share links to reconstitute a Resolver state or
   * an effect pushes a new process id to the query params.
   */
  useLayoutEffect(() => {
    if (
      paramsSelectedEvent &&
      // Check state to ensure we don't dispatch this in a way that causes unnecessary re-renders, or disrupts animation:
      paramsSelectedEvent !== lastUpdatedProcess &&
      paramsSelectedEvent !== uiSelectedEvent
    ) {
      setLastUpdatedProcess(paramsSelectedEvent);
      dispatch({
        type: 'appDetectedNewIdFromQueryParams',
        payload: {
          time: timestamp(),
          process: paramsSelectedEvent,
        },
      });
    }
  }, [dispatch, uiSelectedEvent, paramsSelectedEvent, lastUpdatedProcess, timestamp]);

  const relatedEventStats = useSelector(selectors.relatedEventsStats);
  const { crumbId, crumbEvent } = queryParams;
  const relatedStatsForIdFromParams: ResolverNodeStats | undefined = idFromParams
    ? relatedEventStats(idFromParams)
    : undefined;

  /**
   * Determine which set of breadcrumbs to display based on the query parameters
   * for the table & breadcrumb nav.
   *
   */
  const panelToShow = useMemo(() => {
    if (crumbEvent === '' && crumbId === '') {
      /**
       * | Crumb/Table            | &crumbId                   | &crumbEvent              |
       * | :--------------------- | :------------------------- | :----------------------  |
       * | all processes/default  | null                       | null                     |
       */
      return 'processListWithCounts';
    }

    if (graphableProcessEntityIds.has(crumbId)) {
      /**
       * | Crumb/Table            | &crumbId                   | &crumbEvent              |
       * | :--------------------- | :------------------------- | :----------------------  |
       * | process detail         | entity_id of process       | null                     |
       */
      if (crumbEvent === '' && uiSelectedEvent) {
        return 'processDetails';
      }

      /**
       * | Crumb/Table            | &crumbId                   | &crumbEvent              |
       * | :--------------------- | :------------------------- | :----------------------  |
       * | relateds count by type | entity_id of process       | 'all'                    |
       */

      if (crumbEvent === 'all' && uiSelectedEvent) {
        return 'eventCountsForProcess';
      }

      /**
       * | Crumb/Table            | &crumbId                   | &crumbEvent              |
       * | :--------------------- | :------------------------- | :----------------------  |
       * | relateds list 1 type   | entity_id of process       | valid related event type |
       */

      if (crumbEvent && crumbEvent.length && uiSelectedEvent) {
        return 'processEventList';
      }
    }

    if (graphableProcessEntityIds.has(crumbEvent)) {
      /**
       * | Crumb/Table            | &crumbId                   | &crumbEvent              |
       * | :--------------------- | :------------------------- | :----------------------  |
       * | related event detail   | event_id of related event  | entity_id of process     |
       */
      return 'relatedEventDetail';
    }

    // The default 'Event List' / 'List of all processes' view
    return 'processListWithCounts';
  }, [uiSelectedEvent, crumbEvent, crumbId, graphableProcessEntityIds]);

  const panelInstance = useMemo(() => {
    if (panelToShow === 'processDetails') {
      return <ProcessDetails processEvent={uiSelectedEvent!} />;
    }

    if (panelToShow === 'eventCountsForProcess') {
      return (
        <EventCountsForProcess
          processEvent={uiSelectedEvent!}
          relatedStats={relatedStatsForIdFromParams!}
        />
      );
    }

    if (panelToShow === 'processEventList') {
      return (
        <ProcessEventList
          processEvent={uiSelectedEvent!}
          relatedStats={relatedStatsForIdFromParams!}
          eventType={crumbEvent}
        />
      );
    }

    if (panelToShow === 'relatedEventDetail') {
      const parentCount: number = Object.values(
        relatedStatsForIdFromParams?.events.byCategory || {}
      ).reduce((sum, val) => sum + val, 0);
      return (
        <RelatedEventDetail
          relatedEventId={crumbId}
          parentEvent={uiSelectedEvent!}
          countForParent={parentCount}
        />
      );
    }
    // The default 'Event List' / 'List of all processes' view
    return <ProcessListWithCounts />;
  }, [uiSelectedEvent, crumbEvent, crumbId, relatedStatsForIdFromParams, panelToShow]);

  return <>{panelInstance}</>;
});
PanelContent.displayName = 'PanelContent';

export const Panel = memo(function Event({ className }: { className?: string }) {
  return (
    <EuiPanel className={className}>
      <PanelContent />
    </EuiPanel>
  );
});
Panel.displayName = 'Panel';
