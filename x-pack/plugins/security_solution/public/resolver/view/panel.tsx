/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback, useMemo, useContext, useLayoutEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';

import { EuiPanel, EuiBreadcrumbs } from '@elastic/eui';
import styled from 'styled-components';
import { displayNameRecord } from './process_event_dot';
import * as selectors from '../store/selectors';
import { useResolverDispatch } from './use_resolver_dispatch';
import * as event from '../../../common/endpoint/models/event';
import { ResolverEvent } from '../../../common/endpoint/types';
import { SideEffectContext } from './side_effect_context';
import { TableServiceError } from './panels/panel_content_error';
import { WaitForRelatedEvents } from './panels/panel_content_wait';
import { RelatedEventDetail } from './panels/panel_content_related_detail';
import { ProcessEventListNarrowedByType } from './panels/panel_content_related_list';
import { EventCountsForProcess } from './panels/panel_content_related_counts';
import { ProcessDetails } from './panels/panel_content_process_detail';
import { ProcessListWithCounts } from './panels/panel_content_process_list';

/**
 * The two query parameters we read/write on to control which view the table presents:
 */
export interface CrumbInfo {
  readonly crumbId: string;
  readonly crumbEvent: string;
}

/**
 * Breadcrumb menu with adjustments per direction from UX team
 */
export const StyledBreadcrumbs = styled(EuiBreadcrumbs)`
  &.euiBreadcrumbs.euiBreadcrumbs--responsive {
    background-color: #f5f5fa;
    padding: 1em;
  }
`;

export const formatter = new Intl.DateTimeFormat(i18n.getLocale(), {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/**
 * @param {ConstructorParameters<typeof Date>[0]} timestamp To be passed through Date->Intl.DateTimeFormat
 * @returns {string} A nicely formatted string for a date
 */
export function formatDate(timestamp: ConstructorParameters<typeof Date>[0]) {
  const date = new Date(timestamp);
  if (isFinite(date.getTime())) {
    return formatter.format(date);
  } else {
    return 'Invalid Date';
  }
}

/**
 * The team decided to use this determinant to express how we comport state in the UI with the values of the two query params:
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
  // The entity id in query params of a graphable process (or false if none is found)
  // For 1 case (the related detail, see below), the process id will be in crumbEvent instead of crumbId
  const idFromParams = useMemo(() => {
    const graphableProcessEntityIds = new Set(graphableProcesses.map(event.entityId));
    return (
      (graphableProcessEntityIds.has(queryParams.crumbId) && queryParams.crumbId) ||
      (graphableProcessEntityIds.has(queryParams.crumbEvent) && queryParams.crumbEvent)
    );
  }, [graphableProcesses, queryParams]);

  // The "selected" node in the tree control. It will sometimes, but not always, correspond with the "active" node
  const selectedDescendantProcessId = useSelector(selectors.uiSelectedDescendantProcessId);
  const uiSelectedEvent = useMemo(() => {
    return graphableProcesses.find((evt) => event.entityId(evt) === selectedDescendantProcessId);
  }, [graphableProcesses, selectedDescendantProcessId]);

  // Until an event is dispatched during update, the event indicated as selected by params may be different than the one in state
  const paramsSelectedEvent = useMemo(() => {
    return graphableProcesses.find((evt) => event.entityId(evt) === idFromParams);
  }, [graphableProcesses, idFromParams]);
  const { timestamp } = useContext(SideEffectContext);
  const [lastUpdatedProcess, setLastUpdatedProcess] = useState<null | ResolverEvent>(null);

  /**
   * When the ui-selected node is _not_ the one indicated by the query params, but the id from params _is_ in the current tree,
   * dispatch a selection action to repair the UI to hold the query id as "selected".
   * This is to cover cases where users e.g. share links to reconstitute a Resolver state and it _should never run otherwise_ under the assumption that the query parameters are updated along with the selection in state
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
        type: 'userBroughtProcessIntoView',
        payload: {
          time: timestamp(),
          process: paramsSelectedEvent,
        },
      });
    }
  }, [dispatch, uiSelectedEvent, paramsSelectedEvent, lastUpdatedProcess, timestamp]);

  /**
   * This updates the breadcrumb nav, the table view
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

      return history.replace(relativeURL);
    },
    [history, urlSearch]
  );

  const relatedEvents = useSelector(selectors.relatedEvents);
  const { crumbId, crumbEvent } = queryParams;

  /**
   * Determine which set of breadcrumbs to display based on the query parameters
   * for the table & breadcrumb nav.
   *
   * "Take query parameters -> return the right component".
   */
  const whichTableViewAndBreadcrumbsToRender = useMemo(() => {
    const graphableProcessEntityIds = new Set(graphableProcesses.map(event.entityId));
    const relatedEventsState = uiSelectedEvent && relatedEvents.get(uiSelectedEvent);

    const fetchingErrorMessage = i18n.translate('xpack.siem.endpoint.resolver.panel.fetchError', {
      defaultMessage: 'Error: Fetching requested related event data failed.',
    });
    const relatedEventDNEMessage = i18n.translate('xpack.siem.endpoint.resolver.panel.relatedDNE', {
      defaultMessage: 'Error: The requested event is not available in this view.',
    });

    if (graphableProcessEntityIds.has(crumbEvent)) {
      if (!relatedEventsState || relatedEventsState === 'waitingForRelatedEventData') {
        // Related event data hasn't been fetched for this process yet:
        // The UI around the menu should dispatch the /events effect for this.
        if (uiSelectedEvent) {
          return (
            <WaitForRelatedEvents
              relatedEventsState={relatedEventsState}
              processEvent={uiSelectedEvent}
            />
          );
        }
      }
      if (relatedEventsState === 'error') {
        // return as error if there was a service error requesting the /events
        return (
          <TableServiceError
            errorMessage={fetchingErrorMessage}
            pushToQueryParams={pushToQueryParams}
          />
        );
      }
      if (typeof relatedEventsState === 'object') {
        const eventFromCrumbId = relatedEventsState.relatedEvents.find(({ relatedEvent }) => {
          return event.eventId(relatedEvent) === crumbId;
        });
        if (!eventFromCrumbId) {
          // Return an indication that it no longer exists (it may have been removed/purged/etc.)
          return (
            <TableServiceError
              errorMessage={relatedEventDNEMessage}
              pushToQueryParams={pushToQueryParams}
            />
          );
        }
        return (
          <RelatedEventDetail
            relatedEvent={eventFromCrumbId.relatedEvent}
            parentEvent={uiSelectedEvent}
            pushToQueryParams={pushToQueryParams}
            relatedEventsState={relatedEventsState}
            eventType={event.eventType(eventFromCrumbId.relatedEvent)}
          />
        );
      }
    } else if (graphableProcessEntityIds.has(crumbId)) {
      if (!uiSelectedEvent) {
        // should never happen, but bail out to default
        return <ProcessListWithCounts pushToQueryParams={pushToQueryParams} />;
      }
      if (crumbEvent === '') {
        // If there is no crumbEvent param, it's for the process detail
        // Note: this view should handle its own effect for requesting /events
        return (
          <ProcessDetails processEvent={uiSelectedEvent} pushToQueryParams={pushToQueryParams} />
        );
      }
      if (!relatedEventsState || relatedEventsState === 'waitingForRelatedEventData') {
        // Related event data hasn't been fetched for this process yet:
        // All the components below this one _require_ related event data, so issue a request
        // and display a waiting state.
        return (
          <WaitForRelatedEvents
            relatedEventsState={relatedEventsState}
            processEvent={uiSelectedEvent}
          />
        );
      }
      if (relatedEventsState === 'error') {
        // return as error if there was a service error requesting the /events
        return (
          <TableServiceError
            errorMessage={fetchingErrorMessage}
            pushToQueryParams={pushToQueryParams}
          />
        );
      }
      if (crumbEvent === 'all' && relatedEventsState) {
        // If crumbEvent param is the special `all`, it's for the view that shows the counts for all a particulat process' related events.
        // Note: this view should handle its own effect for requesting /events
        return (
          <EventCountsForProcess
            processEvent={uiSelectedEvent}
            pushToQueryParams={pushToQueryParams}
            relatedEventsState={relatedEventsState}
          />
        );
      }
      if (crumbEvent in displayNameRecord) {
        // If crumbEvent is one of the known event types, it's for a related event view narrowed by that type
        return (
          <ProcessEventListNarrowedByType
            processEvent={uiSelectedEvent}
            pushToQueryParams={pushToQueryParams}
            relatedEventsState={relatedEventsState}
            eventType={crumbEvent}
          />
        );
      }
    }
    // The default 'Event List' / 'List of all processes' view
    return <ProcessListWithCounts pushToQueryParams={pushToQueryParams} />;
  }, [graphableProcesses, relatedEvents, uiSelectedEvent, crumbEvent, crumbId, pushToQueryParams]);

  return <>{whichTableViewAndBreadcrumbsToRender}</>;
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
