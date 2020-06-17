/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  memo,
  useCallback,
  useMemo,
  useContext,
  useLayoutEffect,
  useState,
  useEffect,
} from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';
import { EuiPanel } from '@elastic/eui';
import { displayNameRecord } from './process_event_dot';
import * as selectors from '../store/selectors';
import { useResolverDispatch } from './use_resolver_dispatch';
import * as event from '../../../common/endpoint/models/event';
import { ResolverEvent } from '../../../common/endpoint/types';
import { SideEffectContext } from './side_effect_context';
import { ProcessEventListNarrowedByType } from './panels/panel_content_related_list';
import { EventCountsForProcess } from './panels/panel_content_related_counts';
import { ProcessDetails } from './panels/panel_content_process_detail';
import { ProcessListWithCounts } from './panels/panel_content_process_list';
import { RelatedEventDetail } from './panels/panel_content_related_detail';
import { CrumbInfo } from './panels/panel_content_utilities';

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
  const history = useHistory();
  const urlSearch = history.location.search;
  const dispatch = useResolverDispatch();

  const queryParams: CrumbInfo = useMemo(() => {
    return { crumbId: '', crumbEvent: '', ...querystring.parse(urlSearch.slice(1)) };
  }, [urlSearch]);

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
  const selectedDescendantProcessId = useSelector(selectors.uiSelectedDescendantProcessId);
  const uiSelectedEvent = useMemo(() => {
    return graphableProcesses.find((evt) => event.entityId(evt) === selectedDescendantProcessId);
  }, [graphableProcesses, selectedDescendantProcessId]);

  // Until an event is dispatched during update, the event indicated as selected by params may
  // be different than the one in state.
  const paramsSelectedEvent = useMemo(() => {
    return graphableProcesses.find((evt) => event.entityId(evt) === idFromParams);
  }, [graphableProcesses, idFromParams]);
  const { timestamp } = useContext(SideEffectContext);
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

  /**
   * This updates the breadcrumb nav and the panel view. It's supplied to each
   * panel content view to allow them to dispatch transitions to each other.
   */
  const pushToQueryParams = useCallback(
    (newCrumbs: CrumbInfo) => {
      // Construct a new set of params from the current set (minus empty params)
      // by assigning the new set of params provided in `newCrumbs`
      const crumbsToPass = {
        ...querystring.parse(urlSearch.slice(1)),
        ...newCrumbs,
      };

      // If either was passed in as empty, remove it from the record
      if (crumbsToPass.crumbId === '') {
        delete crumbsToPass.crumbId;
      }
      if (crumbsToPass.crumbEvent === '') {
        delete crumbsToPass.crumbEvent;
      }

      const relativeURL = { search: querystring.stringify(crumbsToPass) };
      // We probably don't want to nuke the user's history with a huge
      // trail of these, thus `.replace` instead of `.push`
      return history.replace(relativeURL);
    },
    [history, urlSearch]
  );

  // GO JONNY GO
  const relatedEventStats = useSelector(selectors.relatedEventsStats);
  const { crumbId, crumbEvent } = queryParams;
  const relatedStatsForIdFromParams = useMemo(() => {
    if (idFromParams) {
      return relatedEventStats.get(idFromParams);
    }
    return undefined;
  }, [relatedEventStats, idFromParams]);

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

      if (crumbEvent in displayNameRecord && uiSelectedEvent) {
        return 'processEventListNarrowedByType';
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

  useEffect(() => {
    // dispatch `appDisplayedDifferentPanel` to sync state with which panel gets displayed
    dispatch({
      type: 'appDisplayedDifferentPanel',
      payload: panelToShow,
    });
  }, [panelToShow, dispatch]);

  const currentPanelView = useSelector(selectors.currentPanelView);

  const panelInstance = useMemo(() => {
    if (currentPanelView === 'processDetails') {
      return (
        <ProcessDetails processEvent={uiSelectedEvent!} pushToQueryParams={pushToQueryParams} />
      );
    }

    if (currentPanelView === 'eventCountsForProcess') {
      return (
        <EventCountsForProcess
          processEvent={uiSelectedEvent!}
          pushToQueryParams={pushToQueryParams}
          relatedStats={relatedStatsForIdFromParams!}
        />
      );
    }

    if (currentPanelView === 'processEventListNarrowedByType') {
      return (
        <ProcessEventListNarrowedByType
          processEvent={uiSelectedEvent!}
          pushToQueryParams={pushToQueryParams}
          relatedStats={relatedStatsForIdFromParams!}
          eventType={crumbEvent}
        />
      );
    }

    if (currentPanelView === 'relatedEventDetail') {
      const parentCount: number = Object.values(
        relatedStatsForIdFromParams?.events.byCategory || {}
      ).reduce((sum, val) => sum + val, 0);
      return (
        <RelatedEventDetail
          relatedEventId={crumbId}
          parentEvent={uiSelectedEvent!}
          pushToQueryParams={pushToQueryParams}
          countForParent={parentCount}
        />
      );
    }
    // The default 'Event List' / 'List of all processes' view
    return <ProcessListWithCounts pushToQueryParams={pushToQueryParams} />;
  }, [
    uiSelectedEvent,
    crumbEvent,
    crumbId,
    pushToQueryParams,
    relatedStatsForIdFromParams,
    currentPanelView,
  ]);

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
