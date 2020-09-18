/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React, { memo, useMemo, useEffect, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, EuiButtonEmpty, EuiHorizontalRule } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import styled from 'styled-components';
import { StyledPanel } from '../styles';
import { formatDate, BoldCode, StyledTime } from './panel_content_utilities';
import { Breadcrumbs } from './breadcrumbs';
import * as event from '../../../../common/endpoint/models/event';
import { ResolverEvent, ResolverNodeStats } from '../../../../common/endpoint/types';
import * as selectors from '../../store/selectors';
import { useResolverDispatch } from '../use_resolver_dispatch';
import { RelatedEventLimitWarning } from '../limit_warnings';
import { ResolverState } from '../../types';
import { useNavigateOrReplace } from '../use_navigate_or_replace';
import { useRelatedEventDetailNavigation } from '../use_related_event_detail_navigation';
import { PanelLoading } from './panel_loading';

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

const NodeCategoryEntries = memo(function ({
  crumbs,
  matchingEventEntries,
  eventType,
  processEntityId,
}: {
  crumbs: Array<{
    text: string | JSX.Element | null;
    onClick: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement, MouseEvent>) => void;
    href?: string;
  }>;
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
      <Breadcrumbs breadcrumbs={crumbs} />
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

export function NodeEventsOfType({ nodeID, eventType }: { nodeID: string; eventType: string }) {
  const processEvent = useSelector((state: ResolverState) =>
    selectors.processEventForID(state)(nodeID)
  );
  const relatedEventsStats = useSelector((state: ResolverState) =>
    selectors.relatedEventsStats(state)(nodeID)
  );

  return (
    <StyledPanel>
      <NodeEventList
        processEvent={processEvent}
        eventType={eventType}
        relatedStats={relatedEventsStats}
      />
    </StyledPanel>
  );
}

const NodeEventList = memo(function ({
  processEvent,
  eventType,
  relatedStats,
}: {
  processEvent: ResolverEvent | null;
  eventType: string;
  relatedStats: ResolverNodeStats | undefined;
}) {
  const processName = processEvent && event.eventName(processEvent);
  const processEntityId = processEvent ? event.entityId(processEvent) : '';
  const nodesHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({ panelView: 'nodes' })
  );

  const nodesLinkNavProps = useNavigateOrReplace({
    search: nodesHref,
  });
  const totalCount = relatedStats
    ? Object.values(relatedStats.events.byCategory).reduce((sum, val) => sum + val, 0)
    : 0;
  const eventsString = i18n.translate(
    'xpack.securitySolution.endpoint.resolver.panel.processEventListByType.events',
    {
      defaultMessage: 'Events',
    }
  );

  const relatedsReadyMap = useSelector(selectors.relatedEventsReady);
  const relatedsReady = processEntityId && relatedsReadyMap.get(processEntityId);

  const dispatch = useResolverDispatch();

  useEffect(() => {
    if (typeof relatedsReady === 'undefined') {
      dispatch({
        type: 'appDetectedMissingEventData',
        payload: processEntityId,
      });
    }
  }, [relatedsReady, dispatch, processEntityId]);

  const relatedByCategory = useSelector(selectors.relatedEventsByCategory);
  const eventsForCurrentCategory = relatedByCategory(processEntityId)(eventType);
  const relatedEventDetailNavigation = useRelatedEventDetailNavigation({
    nodeID: processEntityId,
    category: eventType,
    events: eventsForCurrentCategory,
  });

  /**
   * A list entry will be displayed for each of these
   */
  const matchingEventEntries: MatchingEventEntry[] = useMemo(() => {
    return eventsForCurrentCategory.map((resolverEvent) => {
      const eventTime = event.eventTimestamp(resolverEvent);
      const formattedDate = typeof eventTime === 'undefined' ? '' : formatDate(eventTime);
      const entityId = event.eventId(resolverEvent);
      return {
        formattedDate,
        eventCategory: `${eventType}`,
        eventType: `${event.ecsEventType(resolverEvent)}`,
        name: event.descriptiveName(resolverEvent),
        setQueryParams: () => relatedEventDetailNavigation(entityId),
      };
    });
  }, [eventType, eventsForCurrentCategory, relatedEventDetailNavigation]);

  const nodeDetailHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({
      panelView: 'nodeDetail',
      panelParameters: { nodeID: processEntityId },
    })
  );

  const nodeDetailNavProps = useNavigateOrReplace({
    search: nodeDetailHref,
  });

  const nodeEventsHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({
      panelView: 'nodeEvents',
      panelParameters: { nodeID: processEntityId },
    })
  );

  const nodeEventsNavProps = useNavigateOrReplace({
    search: nodeEventsHref,
  });
  const crumbs = useMemo(() => {
    return [
      {
        text: eventsString,
        ...nodesLinkNavProps,
      },
      {
        text: processName,
        ...nodeDetailNavProps,
      },
      {
        text: (
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventList.numberOfEvents"
            values={{ totalCount }}
            defaultMessage="{totalCount} Events"
          />
        ),
        ...nodeEventsNavProps,
      },
      {
        text: (
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventList.countByCategory"
            values={{ count: matchingEventEntries.length, category: eventType }}
            defaultMessage="{count} {category}"
          />
        ),
        onClick: () => {},
      },
    ];
  }, [
    eventType,
    eventsString,
    matchingEventEntries.length,
    processName,
    totalCount,
    nodeDetailNavProps,
    nodesLinkNavProps,
    nodeEventsNavProps,
  ]);

  if (!relatedsReady) {
    return <PanelLoading />;
  }

  return (
    <NodeCategoryEntries
      crumbs={crumbs}
      processEntityId={processEntityId}
      matchingEventEntries={matchingEventEntries}
      eventType={eventType}
    />
  );
});
