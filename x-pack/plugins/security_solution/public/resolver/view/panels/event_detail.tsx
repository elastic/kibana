/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-continue */

import React, { memo, useMemo, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiBreadcrumb } from '@elastic/eui';
import { EuiSpacer, EuiText, EuiHorizontalRule, EuiTextColor, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { StyledPanel } from '../styles';
import { StyledDescriptionList, BoldCode, StyledTime } from './styles';
import { GeneratedText } from '../generated_text';
import { CopyablePanelField } from './copyable_panel_field';
import { Breadcrumbs } from './breadcrumbs';
import * as eventModel from '../../../../common/endpoint/models/event';
import * as selectors from '../../store/selectors';
import { PanelLoading } from './panel_loading';
import { PanelContentError } from './panel_content_error';
import { DescriptiveName } from './descriptive_name';
import { useLinkProps } from '../use_link_props';
import type { SafeResolverEvent } from '../../../../common/endpoint/types';
import { deepObjectEntries } from './deep_object_entries';
import { useFormattedDate } from './use_formatted_date';
import * as nodeDataModel from '../../models/node_data';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import type { State } from '../../../common/store/types';

const eventDetailRequestError = i18n.translate(
  'xpack.securitySolution.resolver.panel.eventDetail.requestError',
  {
    defaultMessage: 'Event details were unable to be retrieved',
  }
);

export const EventDetail = memo(function EventDetail({
  id,
  nodeID,
  eventCategory: eventType,
}: {
  id: string;
  nodeID: string;
  /** The event type to show in the breadcrumbs */
  eventCategory: string;
}) {
  const isEventLoading = useSelector((state: State) =>
    selectors.isCurrentRelatedEventLoading(state.analyzer[id])
  );
  const isTreeLoading = useSelector((state: State) => selectors.isTreeLoading(state.analyzer[id]));
  const processEvent = useSelector((state: State) =>
    nodeDataModel.firstEvent(selectors.nodeDataForID(state.analyzer[id])(nodeID))
  );
  const nodeStatus = useSelector((state: State) =>
    selectors.nodeDataStatus(state.analyzer[id])(nodeID)
  );

  const isNodeDataLoading = nodeStatus === 'loading';
  const isLoading = isEventLoading || isTreeLoading || isNodeDataLoading;

  const event = useSelector((state: State) =>
    selectors.currentRelatedEventData(state.analyzer[id])
  );

  return isLoading ? (
    <StyledPanel hasBorder>
      <PanelLoading id={id} />
    </StyledPanel>
  ) : event ? (
    <EventDetailContents
      id={id}
      nodeID={nodeID}
      event={event}
      processEvent={processEvent}
      eventType={eventType}
    />
  ) : (
    <StyledPanel hasBorder>
      <PanelContentError id={id} translatedErrorMessage={eventDetailRequestError} />
    </StyledPanel>
  );
});

/**
 * This view presents a detailed view of all the available data for a related event, split and titled by the "section"
 * it appears in the underlying ResolverEvent
 */
// eslint-disable-next-line react/display-name
const EventDetailContents = memo(function ({
  id,
  nodeID,
  event,
  eventType,
  processEvent,
}: {
  id: string;
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
        id={id}
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
    const expandedEventObject: object = expandDottedObject(event);
    for (const [key, value] of Object.entries(expandedEventObject)) {
      // ignore these keys
      if (key === 'agent' || key === 'ecs' || key === '@timestamp' || !value) {
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
              columnWidths={['fit-content(8em)', 'auto']} // sets a max width of 8em on the title column
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
  id,
  nodeID,
  nodeName,
  event,
  breadcrumbEventCategory,
}: {
  id: string;
  nodeID: string;
  nodeName: string | null | undefined;
  event: SafeResolverEvent;
  breadcrumbEventCategory: string;
}) {
  const countByCategory = useSelector((state: State) =>
    selectors.relatedEventCountOfTypeForNode(state.analyzer[id])(nodeID, breadcrumbEventCategory)
  );
  const relatedEventCount: number | undefined = useSelector((state: State) =>
    selectors.relatedEventTotalCount(state.analyzer[id])(nodeID)
  );
  const nodesLinkNavProps = useLinkProps(id, {
    panelView: 'nodes',
  });

  const nodeDetailLinkNavProps = useLinkProps(id, {
    panelView: 'nodeDetail',
    panelParameters: { nodeID },
  });

  const nodeEventsLinkNavProps = useLinkProps(id, {
    panelView: 'nodeEvents',
    panelParameters: { nodeID },
  });

  const nodeEventsInCategoryLinkNavProps = useLinkProps(id, {
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

// Also prevents horizontal scrollbars on long descriptive names
const StyledDescriptiveName = memo(styled(EuiText)`
  padding-right: 1em;
  overflow-wrap: break-word;
`);

const StyledFlexTitle = memo(styled('h3')`
  align-items: center;
  display: flex;
  flex-flow: row;
  font-size: 1.2em;
`);

// eslint-disable-next-line react/display-name
const TitleHr = memo(() => {
  return <EuiHorizontalRule margin="none" size="half" />;
});
