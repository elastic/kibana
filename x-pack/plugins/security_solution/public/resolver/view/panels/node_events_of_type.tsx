/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React, { memo, useMemo, useEffect, Fragment, ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, EuiButtonEmpty, EuiHorizontalRule } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import styled from 'styled-components';
import { StyledPanel } from '../styles';
import { formatDate, BoldCode, StyledTime } from './panel_content_utilities';
import { Breadcrumbs } from './breadcrumbs';
import * as event from '../../../../common/endpoint/models/event';
import { ResolverEvent } from '../../../../common/endpoint/types';
import * as selectors from '../../store/selectors';
import { useResolverDispatch } from '../use_resolver_dispatch';
import { RelatedEventLimitWarning } from '../limit_warnings';
import { ResolverState } from '../../types';
import { useRelatedEventDetailNavigation } from '../use_related_event_detail_navigation';
import { PanelLoading } from './panel_loading';
import { DescriptiveName } from './descriptive_name';
import { useLinkProps } from '../use_link_props';

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
  name: ReactNode;
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
  nodeID,
}: {
  crumbs: Array<{
    text: string | JSX.Element | null;
    onClick: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement, MouseEvent>) => void;
    href?: string;
  }>;
  matchingEventEntries: MatchingEventEntry[];
  eventType: string;
  nodeID: string;
}) {
  const relatedLookupsByCategory = useSelector(selectors.relatedEventInfoByEntityId);
  const lookupsForThisNode = relatedLookupsByCategory(nodeID);
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
              <EuiButtonEmpty onClick={eventView.setQueryParams}>{eventView.name}</EuiButtonEmpty>
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
  const eventCount = useSelector(
    (state: ResolverState) => selectors.relatedEventsStats(state)(nodeID)?.events.total
  );

  return (
    <StyledPanel>
      {eventCount === undefined || processEvent === null ? (
        <PanelLoading />
      ) : (
        <NodeEventList
          processEvent={processEvent}
          eventType={eventType}
          eventCount={eventCount}
          nodeID={nodeID}
        />
      )}
    </StyledPanel>
  );
}

const NodeEventList = memo(function ({
  processEvent,
  eventType,
  eventCount,
  nodeID,
}: {
  processEvent: ResolverEvent | null;
  eventType: string;
  eventCount: number;
  nodeID: string;
}) {
  const processName = processEvent && event.processName(processEvent);

  const nodesLinkNavProps = useLinkProps({
    panelView: 'nodes',
  });
  const eventsString = i18n.translate(
    'xpack.securitySolution.endpoint.resolver.panel.processEventListByType.events',
    {
      defaultMessage: 'Events',
    }
  );

  const relatedsReadyMap = useSelector(selectors.relatedEventsReady);
  const relatedsReady = relatedsReadyMap.get(nodeID);

  const dispatch = useResolverDispatch();

  useEffect(() => {
    if (typeof relatedsReady === 'undefined') {
      dispatch({
        type: 'appDetectedMissingEventData',
        payload: nodeID,
      });
    }
  }, [relatedsReady, dispatch, nodeID]);

  const relatedByCategory = useSelector(selectors.relatedEventsByCategory);
  const eventsForCurrentCategory = relatedByCategory(nodeID)(eventType);
  const relatedEventDetailNavigation = useRelatedEventDetailNavigation({
    nodeID,
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
        name: <DescriptiveName event={resolverEvent} />,
        setQueryParams: () => relatedEventDetailNavigation(entityId),
      };
    });
  }, [eventType, eventsForCurrentCategory, relatedEventDetailNavigation]);

  const nodeDetailNavProps = useLinkProps({
    panelView: 'nodeDetail',
    panelParameters: { nodeID },
  });

  const nodeEventsNavProps = useLinkProps({
    panelView: 'nodeEvents',
    panelParameters: { nodeID },
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
            values={{ totalCount: eventCount }}
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
    eventCount,
    eventType,
    eventsString,
    matchingEventEntries.length,
    processName,
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
      nodeID={nodeID}
      matchingEventEntries={matchingEventEntries}
      eventType={eventType}
    />
  );
});
