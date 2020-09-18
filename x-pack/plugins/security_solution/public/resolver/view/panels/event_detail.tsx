/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React, { memo, useMemo, useEffect, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, EuiDescriptionList, EuiTextColor, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { StyledPanel } from '../styles';
import { BoldCode, StyledTime, GeneratedText } from './panel_content_utilities';
import { Breadcrumbs } from './breadcrumbs';
import * as eventModel from '../../../../common/endpoint/models/event';
import * as selectors from '../../store/selectors';
import { useResolverDispatch } from '../use_resolver_dispatch';
import { PanelContentError } from './panel_content_error';
import { PanelLoading } from './panel_loading';
import { ResolverState } from '../../types';
import { DescriptiveName } from './descriptive_name';
import { useLinkProps } from '../use_link_props';
import { ResolverEvent } from '../../../../common/endpoint/types';

const StyledDescriptionList = memo(styled(EuiDescriptionList)`
  &.euiDescriptionList.euiDescriptionList--column dt.euiDescriptionList__title.desc-title {
    max-width: 8em;
    overflow-wrap: break-word;
  }
  &.euiDescriptionList.euiDescriptionList--column dd.euiDescriptionList__description {
    max-width: calc(100% - 8.5em);
    overflow-wrap: break-word;
  }
`);

// Also prevents horizontal scrollbars on long descriptive names
const StyledDescriptiveName = memo(styled(EuiText)`
  padding-right: 1em;
  overflow-wrap: break-word;
`);

const StyledFlexTitle = memo(styled('h3')`
  display: flex;
  flex-flow: row;
  font-size: 1.2em;
`);
const StyledTitleRule = memo(styled('hr')`
  &.euiHorizontalRule.euiHorizontalRule--full.euiHorizontalRule--marginSmall.override {
    display: block;
    flex: 1;
    margin-left: 0.5em;
  }
`);

const TitleHr = memo(() => {
  return (
    <StyledTitleRule className="euiHorizontalRule euiHorizontalRule--full euiHorizontalRule--marginSmall override" />
  );
});

/**
 * Take description list entries and prepare them for display by
 * seeding with `<wbr />` tags.
 *
 * @param entries {title: string, description: string}[]
 */
function entriesForDisplay(entries: Array<{ title: string; description: string }>) {
  return entries.map((entry) => {
    return {
      description: <GeneratedText>{entry.description}</GeneratedText>,
      title: <GeneratedText>{entry.title}</GeneratedText>,
    };
  });
}

export const EventDetail = memo(
  ({
    nodeID,
    eventID,
    eventType,
  }: {
    nodeID: string;
    eventID: string;
    /** The event type to show in the breadcrumbs */
    eventType: string;
  }) => {
    const event = useSelector((state: ResolverState) =>
      selectors.eventByID(state)({ nodeID, eventID })
    );
    const processEvent = useSelector((state: ResolverState) =>
      selectors.processEventForID(state)(nodeID)
    );
    if (event && processEvent) {
      return (
        <EventDetailContents
          nodeID={nodeID}
          eventID={eventID}
          event={event}
          processEvent={processEvent}
          eventType={eventType}
        />
      );
    } else {
      return (
        <StyledPanel>
          <PanelLoading />
        </StyledPanel>
      );
    }
  }
);

/**
 * This view presents a detailed view of all the available data for a related event, split and titled by the "section"
 * it appears in the underlying ResolverEvent
 */
const EventDetailContents = memo(function ({
  nodeID,
  eventID,
  event,
  eventType,
  processEvent,
}: {
  nodeID: string;
  eventID: string;
  event: ResolverEvent;
  /**
   * Event type to use in the breadcrumbs
   */
  eventType: string;
  processEvent: ResolverEvent;
}) {
  const [
    relatedEventToShowDetailsFor,
    countBySameCategory,
    relatedEventCategory = i18n.translate(
      'xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.NA',
      {
        defaultMessage: 'N/A',
      }
    ),
    sections,
    formattedDate,
  ] = useSelector((state: ResolverState) =>
    selectors.relatedEventDisplayInfoByEntityAndSelfId(state)(nodeID, eventID)
  );

  return (
    <StyledPanel>
      <EventDetailBreadcrumbs
        nodeID={nodeID}
        nodeName={processEvent ? eventModel.processName(processEvent) : null}
        event={event}
        breadcrumbEventCategory={eventType}
      />
      <EuiSpacer size="l" />
      <EuiText size="s">
        <BoldCode>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.categoryAndType"
            values={{
              category: relatedEventCategory,
              eventType: String(eventModel.ecsEventType(event)),
            }}
            defaultMessage="{category} {eventType}"
          />
        </BoldCode>
        <StyledTime dateTime={formattedDate}>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.atTime"
            values={{ date: formattedDate }}
            defaultMessage="@ {date}"
          />
        </StyledTime>
      </EuiText>
      <EuiSpacer size="m" />
      <StyledDescriptiveName>
        <GeneratedText>
          <DescriptiveName event={event} />
        </GeneratedText>
      </StyledDescriptiveName>
      <EuiSpacer size="l" />
      {sections.map(({ sectionTitle, entries }, index) => {
        const displayEntries = entriesForDisplay(entries);
        return (
          <Fragment key={index}>
            {index === 0 ? null : <EuiSpacer size="m" />}
            <EuiTitle size="xxxs">
              <EuiTextColor color="subdued">
                <StyledFlexTitle>
                  {sectionTitle}
                  <TitleHr />
                </StyledFlexTitle>
              </EuiTextColor>
            </EuiTitle>
            <EuiSpacer size="m" />
            <StyledDescriptionList
              type="column"
              align="left"
              titleProps={{ className: 'desc-title' }}
              compressed
              listItems={displayEntries}
            />
            {index === sections.length - 1 ? null : <EuiSpacer size="m" />}
          </Fragment>
        );
      })}
    </StyledPanel>
  );
});

function EventDetailBreadcrumbs({
  nodeID,
  nodeName,
  event,
  breadcrumbEventCategory,
}: {
  nodeID: string;
  nodeName: string | null;
  event: ResolverEvent;
  breadcrumbEventCategory: string;
}) {
  const countByCategory = useSelector((state: ResolverState) =>
    selectors.relatedEventCountByType(state)(nodeID, breadcrumbEventCategory)
  );
  const relatedEventCount: number | undefined = useSelector((state: ResolverState) =>
    selectors.relatedEventTotalCount(state)(nodeID)
  );
  const nodesLinkNavProps = useLinkProps({
    panelView: 'nodes',
  });

  const nodeDetailLinkNavProps = useLinkProps({
    panelView: 'nodeDetail',
    panelParameters: { nodeID },
  });

  const nodeEventsLinkNavProps = useLinkProps({
    panelView: 'nodeEvents',
    panelParameters: { nodeID },
  });

  const nodeEventsOfTypeLinkNavProps = useLinkProps({
    panelView: 'nodeEventsOfType',
    panelParameters: { nodeID, eventType: breadcrumbEventCategory },
  });
  const breadcrumbs = useMemo(() => {
    return [
      {
        text: i18n.translate(
          'xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.events',
          {
            defaultMessage: 'Events',
          }
        ),
        ...nodesLinkNavProps,
      },
      {
        text: nodeName,
        ...nodeDetailLinkNavProps,
      },
      {
        text: (
          <>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.numberOfEvents"
              values={{ totalCount: relatedEventCount }}
              defaultMessage="{totalCount} Events"
            />
          </>
        ),
        ...nodeEventsLinkNavProps,
      },
      {
        text: (
          <>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.countByCategory"
              values={{ count: countByCategory, category: breadcrumbEventCategory }}
              defaultMessage="{count} {category}"
            />
          </>
        ),
        ...nodeEventsOfTypeLinkNavProps,
      },
      {
        text: <DescriptiveName event={event} />,
      },
    ];
  }, [
    breadcrumbEventCategory,
    countByCategory,
    event,
    nodeDetailLinkNavProps,
    nodeEventsLinkNavProps,
    nodeName,
    relatedEventCount,
    nodesLinkNavProps,
    nodeEventsOfTypeLinkNavProps,
  ]);
  return <Breadcrumbs breadcrumbs={breadcrumbs} />;
}
