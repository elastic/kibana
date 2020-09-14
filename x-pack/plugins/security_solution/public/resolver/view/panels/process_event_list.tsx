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
import styled from 'styled-components';
import { formatDate, StyledBreadcrumbs, BoldCode, StyledTime } from './panel_content_utilities';
import * as event from '../../../../common/endpoint/models/event';
import { ResolverEvent, ResolverNodeStats } from '../../../../common/endpoint/types';
import * as selectors from '../../store/selectors';
import { useResolverDispatch } from '../use_resolver_dispatch';
import { RelatedEventLimitWarning } from '../limit_warnings';
import { useReplaceBreadcrumbParameters } from '../use_replace_breadcrumb_parameters';

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
  setQueryParams: () => void;
}

const StyledRelatedLimitWarning = styled(RelatedEventLimitWarning)`
  flex-flow: row wrap;
  display: block;
  align-items: baseline;
  margin-top: 1em;

  & .euiCallOutHeader {
    display: inline;
    margin-right: 0.25em;
  }

  & .euiText {
    display: inline;
  }

  & .euiText p {
    display: inline;
  }
`;

const DisplayList = memo(function DisplayList({
  crumbs,
  matchingEventEntries,
  eventType,
  processEntityId,
}: {
  crumbs: Array<{ text: string | JSX.Element; onClick: () => void }>;
  matchingEventEntries: MatchingEventEntry[];
  eventType: string;
  processEntityId: string;
}) {
  const relatedLookupsByCategory = useSelector(selectors.relatedEventInfoByEntityId);
  const lookupsForThisNode = relatedLookupsByCategory(processEntityId);
  const shouldShowLimitWarning = lookupsForThisNode?.shouldShowLimitForCategory(eventType);
  const numberDisplayed = lookupsForThisNode?.numberActuallyDisplayedForCategory(eventType);
  const numberMissing = lookupsForThisNode?.numberNotDisplayedForCategory(eventType);

  return (
    <>
      <StyledBreadcrumbs breadcrumbs={crumbs} />
      {shouldShowLimitWarning && typeof numberDisplayed !== 'undefined' && numberMissing ? (
        <StyledRelatedLimitWarning
          eventType={eventType}
          numberActuallyDisplayed={numberDisplayed}
          numberMissing={numberMissing}
        />
      ) : null}
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
                <StyledTime dateTime={eventView.formattedDate}>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.atTime"
                    values={{ date: eventView.formattedDate }}
                    defaultMessage="@ {date}"
                  />
                </StyledTime>
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

export const ProcessEventList = memo(function ProcessEventList({
  processEvent,
  eventType,
  relatedStats,
}: {
  processEvent: ResolverEvent;
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

  const dispatch = useResolverDispatch();

  useEffect(() => {
    if (typeof relatedsReady === 'undefined') {
      dispatch({
        type: 'appDetectedMissingEventData',
        payload: processEntityId,
      });
    }
  }, [relatedsReady, dispatch, processEntityId]);

  const pushToQueryParams = useReplaceBreadcrumbParameters();

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

  const relatedByCategory = useSelector(selectors.relatedEventsByCategory);

  /**
   * A list entry will be displayed for each of these
   */
  const matchingEventEntries: MatchingEventEntry[] = useMemo(() => {
    const relateds = relatedByCategory(processEntityId)(eventType).map((resolverEvent) => {
      const eventTime = event.eventTimestamp(resolverEvent);
      const formattedDate = typeof eventTime === 'undefined' ? '' : formatDate(eventTime);
      const entityId = event.eventId(resolverEvent);

      return {
        formattedDate,
        eventCategory: `${eventType}`,
        eventType: `${event.ecsEventType(resolverEvent)}`,
        name: event.descriptiveName(resolverEvent),
        setQueryParams: () => {
          pushToQueryParams({
            crumbId: entityId === undefined ? '' : String(entityId),
            crumbEvent: processEntityId,
          });
        },
      };
    });
    return relateds;
  }, [relatedByCategory, eventType, processEntityId, pushToQueryParams]);

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

  return (
    <DisplayList
      crumbs={crumbs}
      processEntityId={processEntityId}
      matchingEventEntries={matchingEventEntries}
      eventType={eventType}
    />
  );
});
ProcessEventList.displayName = 'ProcessEventList';
