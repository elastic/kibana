/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo, useEffect, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTitle, EuiSpacer, EuiText, EuiButtonEmpty, EuiHorizontalRule } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { CrumbInfo, formatDate, StyledBreadcrumbs, BoldCode } from './panel_content_utilities';
import * as event from '../../../../common/endpoint/models/event';
import { ResolverEvent, ResolverNodeStats } from '../../../../common/endpoint/types';
import * as selectors from '../../store/selectors';
import { useResolverDispatch } from '../use_resolver_dispatch';

/**
 * This view presents a list of related events of a given type for a given process.
 * It will appear like:
 *
 * |                                                        |
 * | :----------------------------------------------------- |
 * | **registry deletion** @ *3:32PM..* *HKLM/software...*  |
 * | **file creation** @ *3:34PM..* *C:/directory/file.exe* |
 */

interface MatchingEventEntry {
  formattedDate: string;
  eventType: string;
  eventCategory: string;
  name: { subject: string; descriptor?: string };
  entityId: string;
  setQueryParams: () => void;
}

const DisplayList = memo(function DisplayList({
  crumbs,
  matchingEventEntries,
}: {
  crumbs: Array<{ text: string | JSX.Element; onClick: () => void }>;
  matchingEventEntries: MatchingEventEntry[];
}) {
  return (
    <>
      <StyledBreadcrumbs breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <>
        {matchingEventEntries.map((eventView, index) => {
          const { subject, descriptor = '' } = eventView.name;
          return (
            <Fragment key={index}>
              <EuiText>
                <BoldCode>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.categoryAndType"
                    values={{
                      category: eventView.eventCategory,
                      eventType: eventView.eventType,
                    }}
                    defaultMessage="{category} {eventType}"
                  />
                </BoldCode>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.atTime"
                  values={{ date: eventView.formattedDate }}
                  defaultMessage="@ {date}"
                />
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiButtonEmpty onClick={eventView.setQueryParams}>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.resolver.panel.processEventListByType.eventDescriptiveName"
                  values={{ subject, descriptor }}
                  defaultMessage="{descriptor} {subject}"
                />
              </EuiButtonEmpty>
              {index === matchingEventEntries.length - 1 ? null : <EuiHorizontalRule margin="m" />}
            </Fragment>
          );
        })}
      </>
    </>
  );
});

export const ProcessEventListNarrowedByType = memo(function ProcessEventListNarrowedByType({
  processEvent,
  eventType,
  relatedStats,
  pushToQueryParams,
}: {
  processEvent: ResolverEvent;
  pushToQueryParams: (arg0: CrumbInfo) => unknown;
  eventType: string;
  relatedStats: ResolverNodeStats;
}) {
  const processName = processEvent && event.eventName(processEvent);
  const processEntityId = event.entityId(processEvent);
  const totalCount = Object.values(relatedStats.events.byCategory).reduce(
    (sum, val) => sum + val,
    0
  );
  const eventsString = i18n.translate(
    'xpack.securitySolution.endpoint.resolver.panel.processEventListByType.events',
    {
      defaultMessage: 'Events',
    }
  );
  const waitingString = i18n.translate(
    'xpack.securitySolution.endpoint.resolver.panel.processEventListByType.wait',
    {
      defaultMessage: 'Waiting For Events...',
    }
  );

  const relatedsReadyMap = useSelector(selectors.relatedEventsReady);
  const relatedsReady = relatedsReadyMap.get(processEntityId);

  const relatedEventsForThisProcess = useSelector(selectors.relatedEventsByEntityId).get(
    processEntityId
  );
  const dispatch = useResolverDispatch();

  useEffect(() => {
    if (typeof relatedsReady === 'undefined') {
      dispatch({
        type: 'appDetectedMissingEventData',
        payload: processEntityId,
      });
    }
  }, [relatedsReady, dispatch, processEntityId]);

  const waitCrumbs = useMemo(() => {
    return [
      {
        text: eventsString,
        onClick: () => {
          pushToQueryParams({ crumbId: '', crumbEvent: '' });
        },
      },
    ];
  }, [pushToQueryParams, eventsString]);

  const relatedEventsToDisplay = useMemo(() => {
    return relatedEventsForThisProcess?.events || [];
  }, [relatedEventsForThisProcess?.events]);

  /**
   * A list entry will be displayed for each of these
   */
  const matchingEventEntries: MatchingEventEntry[] = useMemo(() => {
    const relateds = relatedEventsToDisplay
      .reduce((a: ResolverEvent[], candidate) => {
        if (event.primaryEventCategory(candidate) === eventType) {
          a.push(candidate);
        }
        return a;
      }, [])
      .map((resolverEvent) => {
        const eventTime = event.eventTimestamp(resolverEvent);
        const formattedDate = typeof eventTime === 'undefined' ? '' : formatDate(eventTime);
        const entityId = event.eventId(resolverEvent);

        return {
          formattedDate,
          eventCategory: `${eventType}`,
          eventType: `${event.ecsEventType(resolverEvent)}`,
          name: event.descriptiveName(resolverEvent),
          entityId,
          setQueryParams: () => {
            pushToQueryParams({ crumbId: entityId, crumbEvent: processEntityId });
          },
        };
      });
    return relateds;
  }, [relatedEventsToDisplay, eventType, processEntityId, pushToQueryParams]);

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
            <FormattedMessage
              id="xpack.securitySolution.endpoint.resolver.panel.relatedEventList.numberOfEvents"
              values={{ totalCount }}
              defaultMessage="{totalCount} Events"
            />
          </>
        ),
        onClick: () => {
          pushToQueryParams({ crumbId: processEntityId, crumbEvent: 'all' });
        },
      },
      {
        text: (
          <>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.resolver.panel.relatedEventList.countByCategory"
              values={{ count: matchingEventEntries.length, category: eventType }}
              defaultMessage="{count} {category}"
            />
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

  /**
   * Wait here until the effect resolves...
   */
  if (!relatedsReady) {
    return (
      <>
        <StyledBreadcrumbs breadcrumbs={waitCrumbs} />
        <EuiSpacer size="l" />
        <EuiTitle>
          <h4>{waitingString}</h4>
        </EuiTitle>
      </>
    );
  }

  return <DisplayList crumbs={crumbs} matchingEventEntries={matchingEventEntries} />;
});
ProcessEventListNarrowedByType.displayName = 'ProcessEventListNarrowedByType';
