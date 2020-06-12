/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiI18nNumber, EuiSpacer, EuiText, EuiButtonEmpty, EuiHorizontalRule } from '@elastic/eui';
import { CrumbInfo, formatDate, StyledBreadcrumbs } from '../panel';
import { RelatedEventDataEntryWithStats } from '../../types';
import * as event from '../../../../common/endpoint/models/event';
import { BoldCode } from './panel_content_related_detail';
import { ResolverEvent } from '../../../../common/endpoint/types';

/**
 * This view presents a list of related events of a given type for a given process.
 * It will appear like:
 *
 * |                                                        |
 * | :----------------------------------------------------- |
 * | **registry deletion** @ *3:32PM..* *HKLM/software...*  |
 * | **file creation** @ *3:34PM..* *C:/directory/file.exe* |
 */
export const ProcessEventListNarrowedByType = memo(function ProcessEventListNarrowedByType({
  processEvent,
  eventType,
  relatedEventsState,
  pushToQueryParams,
}: {
  processEvent: ResolverEvent;
  pushToQueryParams: (arg0: CrumbInfo) => unknown;
  eventType: string;
  relatedEventsState: RelatedEventDataEntryWithStats;
}) {
  const processName = processEvent && event.eventName(processEvent);
  const processEntityId = event.entityId(processEvent);
  const totalCount = Object.values(relatedEventsState.stats).reduce((a, v) => {
    return a + v;
  }, 0);
  const eventsString = i18n.translate(
    'xpack.siem.endpoint.resolver.panel.processEventListByType.events',
    {
      defaultMessage: 'Events',
    }
  );

  /**
   * A list entry will be displayed for each of these
   */
  const matchingEventEntries = useMemo(() => {
    return relatedEventsState.relatedEvents
      .reduce((a: ResolverEvent[], { relatedEvent, relatedEventType }) => {
        if (relatedEventType === eventType) {
          a.push(relatedEvent);
        }
        return a;
      }, [])
      .map((resolverEvent) => {
        const eventTime = event.eventTimestamp(resolverEvent);
        const formattedDate = typeof eventTime === 'undefined' ? '' : formatDate(eventTime);
        const entityId = event.eventId(resolverEvent);
        return {
          formattedDate,
          eventType: `${eventType} ${event.ecsEventType(resolverEvent)}`,
          name: event.descriptiveName(resolverEvent),
          entityId,
          setQueryParams: () => {
            pushToQueryParams({ crumbId: entityId, crumbEvent: processEntityId });
          },
        };
      });
  }, [relatedEventsState, eventType, processEntityId, pushToQueryParams]);

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
          pushToQueryParams({ crumbId: processEntityId, crumbEvent: 'all' });
        },
      },
      {
        text: (
          <>
            <EuiI18nNumber value={matchingEventEntries.length} />
            {/* Non-breaking space->*/ ` ${eventType}`}
          </>
        ),
        onClick: () => {},
      },
    ];
  }, [
    eventType,
    eventsString,
    matchingEventEntries.length,
    processEntityId,
    processName,
    pushToQueryParams,
    totalCount,
  ]);
  return (
    <>
      <StyledBreadcrumbs breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <>
        {matchingEventEntries.map((eventView, index) => {
          return (
            <>
              <EuiText>
                <BoldCode>{eventView.eventType}</BoldCode>
                {' @ '}
                {eventView.formattedDate}
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiButtonEmpty onClick={eventView.setQueryParams}>{eventView.name}</EuiButtonEmpty>
              {index === matchingEventEntries.length - 1 ? null : <EuiHorizontalRule margin="m" />}
            </>
          );
        })}
      </>
    </>
  );
});
ProcessEventListNarrowedByType.displayName = 'ProcessEventListNarrowedByType';
