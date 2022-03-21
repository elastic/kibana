/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-continue */

/* eslint-disable react/display-name */

import React, { memo, useMemo, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBreadcrumb,
  EuiSpacer,
  EuiText,
  EuiDescriptionList,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { StyledPanel } from '../styles';
import { BoldCode, StyledTime } from './styles';
import { GeneratedText } from '../generated_text';
import { CopyablePanelField } from './copyable_panel_field';
import { Breadcrumbs } from './breadcrumbs';
import * as eventModel from '../../../../common/endpoint/models/event';
import * as selectors from '../../store/selectors';
import { PanelLoading } from './panel_loading';
import { PanelContentError } from './panel_content_error';
import { ResolverState } from '../../types';
import { DescriptiveName } from './descriptive_name';
import { useLinkProps } from '../use_link_props';
import { SafeResolverEvent } from '../../../../common/endpoint/types';
import { deepObjectEntries } from './deep_object_entries';
import { useFormattedDate } from './use_formatted_date';
import * as nodeDataModel from '../../models/node_data';

const eventDetailRequestError = i18n.translate(
  'xpack.securitySolution.resolver.panel.eventDetail.requestError',
  {
    defaultMessage: 'Event details were unable to be retrieved',
  }
);

export const EventDetail = memo(function EventDetail({
  nodeID,
  eventCategory: eventType,
}: {
  nodeID: string;
  /** The event type to show in the breadcrumbs */
  eventCategory: string;
}) {
  const isEventLoading = useSelector(selectors.isCurrentRelatedEventLoading);
  const isTreeLoading = useSelector(selectors.isTreeLoading);
  const processEvent = useSelector((state: ResolverState) =>
    nodeDataModel.firstEvent(selectors.nodeDataForID(state)(nodeID))
  );
  const nodeStatus = useSelector((state: ResolverState) => selectors.nodeDataStatus(state)(nodeID));

  const isNodeDataLoading = nodeStatus === 'loading';
  const isLoading = isEventLoading || isTreeLoading || isNodeDataLoading;

  const event = useSelector(selectors.currentRelatedEventData);

  return isLoading ? (
    <StyledPanel hasBorder>
      <PanelLoading />
    </StyledPanel>
  ) : event ? (
    <EventDetailContents
      nodeID={nodeID}
      event={event}
      processEvent={processEvent}
      eventType={eventType}
    />
  ) : (
    <StyledPanel hasBorder>
      <PanelContentError translatedErrorMessage={eventDetailRequestError} />
    </StyledPanel>
  );
});

/**
 * This view presents a detailed view of all the available data for a related event, split and titled by the "section"
 * it appears in the underlying ResolverEvent
 */
const EventDetailContents = memo(function ({
  nodeID,
  event,
  eventType,
  processEvent,
}: {
  nodeID: string;
  event: SafeResolverEvent;
  /**
   * Event type to use in the breadcrumbs
   */
  eventType: string;
  processEvent: SafeResolverEvent | undefined;
}) {
  const timestamp = eventModel.timestampSafeVersion(event);
  const formattedDate =
    useFormattedDate(timestamp) ||
    i18n.translate('xpack.securitySolution.enpdoint.resolver.panelutils.noTimestampRetrieved', {
      defaultMessage: 'No timestamp retrieved',
    });

  const nodeName = processEvent ? eventModel.processNameSafeVersion(processEvent) : null;

  return (
    <StyledPanel hasBorder data-test-subj="resolver:panel:event-detail">
      <EventDetailBreadcrumbs
        nodeID={nodeID}
        nodeName={nodeName}
        event={event}
        breadcrumbEventCategory={eventType}
      />
      <EuiSpacer size="l" />
      <EuiText size="s">
        <BoldCode>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.categoryAndType"
            values={{
              category: eventType,
              eventType: String(eventModel.eventType(event)),
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
      <EventDetailFields event={event} />
    </StyledPanel>
  );
});

function EventDetailFields({ event }: { event: SafeResolverEvent }) {
  const sections = useMemo(() => {
    const returnValue: Array<{
      namespace: React.ReactNode;
      descriptions: Array<{ title: React.ReactNode; description: React.ReactNode }>;
    }> = [];
    for (const [key, value] of Object.entries(event)) {
      // ignore these keys
      if (key === 'agent' || key === 'ecs' || key === 'process' || key === '@timestamp') {
        continue;
      }

      const section = {
        // Group the fields by their top-level namespace
        namespace: <GeneratedText>{key}</GeneratedText>,
        descriptions: deepObjectEntries(value).map(([path, fieldValue]) => {
          // The field name is the 'namespace' key as well as the rest of the path, joined with '.'
          const fieldName = [key, ...path].join('.');

          return {
            title: <GeneratedText>{fieldName}</GeneratedText>,
            description: (
              <CopyablePanelField
                textToCopy={String(fieldValue)}
                content={<GeneratedText>{String(fieldValue)}</GeneratedText>}
              />
            ),
          };
        }),
      };
      returnValue.push(section);
    }
    return returnValue;
  }, [event]);
  return (
    <>
      {sections.map(({ namespace, descriptions }, index) => {
        return (
          <Fragment key={index}>
            {index === 0 ? null : <EuiSpacer size="m" />}
            <EuiTitle size="xxxs">
              <EuiTextColor color="subdued">
                <StyledFlexTitle>
                  {namespace}
                  <TitleHr />
                </StyledFlexTitle>
              </EuiTextColor>
            </EuiTitle>
            <EuiSpacer size="m" />
            <StyledDescriptionList
              type="column"
              align="left"
              titleProps={{
                className: 'desc-title',
                'data-test-subj': 'resolver:panel:event-detail:event-field-title',
              }}
              compressed
              listItems={descriptions}
            />
            {index === sections.length - 1 ? null : <EuiSpacer size="m" />}
          </Fragment>
        );
      })}
    </>
  );
}

function EventDetailBreadcrumbs({
  nodeID,
  nodeName,
  event,
  breadcrumbEventCategory,
}: {
  nodeID: string;
  nodeName: string | null | undefined;
  event: SafeResolverEvent;
  breadcrumbEventCategory: string;
}) {
  const countByCategory = useSelector((state: ResolverState) =>
    selectors.relatedEventCountOfTypeForNode(state)(nodeID, breadcrumbEventCategory)
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

  const nodeEventsInCategoryLinkNavProps = useLinkProps({
    panelView: 'nodeEventsInCategory',
    panelParameters: { nodeID, eventCategory: breadcrumbEventCategory },
  });
  const breadcrumbs = useMemo(() => {
    const crumbs: EuiBreadcrumb[] = [
      {
        text: i18n.translate(
          'xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.events',
          {
            defaultMessage: 'Events',
          }
        ),
        'data-test-subj': 'resolver:event-detail:breadcrumbs:node-list-link',
        ...nodesLinkNavProps,
      },
      {
        text: (
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.numberOfEvents"
            values={{ totalCount: relatedEventCount }}
            defaultMessage="{totalCount} Events"
          />
        ),
        ...nodeEventsLinkNavProps,
      },
      {
        text: (
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.countByCategory"
            values={{ count: countByCategory, category: breadcrumbEventCategory }}
            defaultMessage="{count} {category}"
          />
        ),
        ...nodeEventsInCategoryLinkNavProps,
      },
      {
        text: <DescriptiveName event={event} />,
      },
    ];

    if (nodeName) {
      crumbs.splice(1, 0, {
        text: nodeName,
        ...nodeDetailLinkNavProps,
      });
    }

    return crumbs;
  }, [
    breadcrumbEventCategory,
    countByCategory,
    event,
    nodeDetailLinkNavProps,
    nodeEventsLinkNavProps,
    nodeName,
    relatedEventCount,
    nodesLinkNavProps,
    nodeEventsInCategoryLinkNavProps,
  ]);
  return <Breadcrumbs breadcrumbs={breadcrumbs} />;
}

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
