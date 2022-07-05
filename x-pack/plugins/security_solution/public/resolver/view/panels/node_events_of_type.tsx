/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React, { memo, useCallback, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiSpacer,
  EuiText,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiFlexItem,
  EuiButton,
  EuiCallOut,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';
import { StyledPanel } from '../styles';
import { BoldCode, StyledTime } from './styles';
import { Breadcrumbs } from './breadcrumbs';
import * as eventModel from '../../../../common/endpoint/models/event';
import { SafeResolverEvent } from '../../../../common/endpoint/types';
import * as selectors from '../../store/selectors';
import { ResolverState } from '../../types';
import { PanelLoading } from './panel_loading';
import { DescriptiveName } from './descriptive_name';
import { useLinkProps } from '../use_link_props';
import { useResolverDispatch } from '../use_resolver_dispatch';
import { useFormattedDate } from './use_formatted_date';

/**
 * Render a list of events that are related to `nodeID` and that have a category of `eventType`.
 */
export const NodeEventsInCategory = memo(function ({
  nodeID,
  eventCategory,
}: {
  nodeID: string;
  eventCategory: string;
}) {
  const node = useSelector((state: ResolverState) => selectors.graphNodeForID(state)(nodeID));
  const isLoading = useSelector(selectors.isLoadingNodeEventsInCategory);
  const hasError = useSelector(selectors.hadErrorLoadingNodeEventsInCategory);

  return (
    <>
      {isLoading ? (
        <StyledPanel hasBorder>
          <PanelLoading />
        </StyledPanel>
      ) : (
        <StyledPanel hasBorder data-test-subj="resolver:panel:events-in-category">
          {hasError || !node ? (
            <EuiCallOut
              title={i18n.translate(
                'xpack.securitySolution.endpoint.resolver.panel.nodeEventsByType.errorPrimary',
                {
                  defaultMessage: 'Unable to load events.',
                }
              )}
              color="danger"
              iconType="alert"
              data-test-subj="resolver:nodeEventsInCategory:error"
            >
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.resolver.panel.nodeEventsByType.errorSecondary"
                  defaultMessage="An error occurred when fetching the events."
                />
              </p>
            </EuiCallOut>
          ) : (
            <>
              <NodeEventsInCategoryBreadcrumbs
                nodeName={node.name}
                eventCategory={eventCategory}
                nodeID={nodeID}
              />
              <EuiSpacer size="l" />
              <NodeEventList eventCategory={eventCategory} nodeID={nodeID} />
            </>
          )}
        </StyledPanel>
      )}
    </>
  );
});

/**
 * Rendered for each event in the list.
 */
const NodeEventsListItem = memo(function ({
  event,
  nodeID,
  eventCategory,
}: {
  event: SafeResolverEvent;
  nodeID: string;
  eventCategory: string;
}) {
  const timestamp = eventModel.eventTimestamp(event);
  const eventID = eventModel.eventID(event);
  const winlogRecordID = eventModel.winlogRecordID(event);
  const date =
    useFormattedDate(timestamp) ||
    i18n.translate('xpack.securitySolution.enpdoint.resolver.panelutils.noTimestampRetrieved', {
      defaultMessage: 'No timestamp retrieved',
    });
  const linkProps = useLinkProps({
    panelView: 'eventDetail',
    panelParameters: {
      nodeID,
      eventCategory,
      eventID,
      eventTimestamp: String(timestamp),
      winlogRecordID: String(winlogRecordID),
    },
  });
  return (
    <>
      <EuiText>
        <BoldCode>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.categoryAndType"
            values={{
              category: eventModel.eventCategory(event).join(', '),
              eventType: eventModel.eventType(event).join(', '),
            }}
            defaultMessage="{category} {eventType}"
          />
        </BoldCode>
        <StyledTime dateTime={date}>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.atTime"
            values={{ date }}
            defaultMessage="@ {date}"
          />
        </StyledTime>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiButtonEmpty
        data-test-subj="resolver:panel:node-events-in-category:event-link"
        {...linkProps}
      >
        <DescriptiveName event={event} />
      </EuiButtonEmpty>
    </>
  );
});

/**
 * Renders a list of events with a separator in between.
 */
const NodeEventList = memo(function NodeEventList({
  eventCategory,
  nodeID,
}: {
  eventCategory: string;
  nodeID: string;
}) {
  const events = useSelector(selectors.nodeEventsInCategory);
  const dispatch = useResolverDispatch();
  const handleLoadMore = useCallback(() => {
    dispatch({
      type: 'userRequestedAdditionalRelatedEvents',
    });
  }, [dispatch]);
  const isLoading = useSelector(selectors.isLoadingMoreNodeEventsInCategory);
  const hasMore = useSelector(selectors.lastRelatedEventResponseContainsCursor);
  return (
    <>
      {events.map((event, index) => (
        <Fragment key={index}>
          <NodeEventsListItem nodeID={nodeID} eventCategory={eventCategory} event={event} />
          {index === events.length - 1 ? null : <EuiHorizontalRule margin="m" />}
        </Fragment>
      ))}
      {hasMore && (
        <EuiFlexItem grow={false}>
          <EuiButton
            color={'primary'}
            size="s"
            fill
            onClick={handleLoadMore}
            isLoading={isLoading}
            data-test-subj="resolver:nodeEventsInCategory:loadMore"
          >
            <FormattedMessage
              id="xpack.securitySolution.endpoint.resolver.panel.nodeEventsByType.loadMore"
              defaultMessage="Load More Data"
            />
          </EuiButton>
        </EuiFlexItem>
      )}
    </>
  );
});

/**
 * Renders `Breadcrumbs`.
 */
const NodeEventsInCategoryBreadcrumbs = memo(function ({
  nodeName,
  eventCategory,
  nodeID,
}: {
  nodeName: React.ReactNode;
  eventCategory: string;
  nodeID: string;
}) {
  const eventCount = useSelector((state: ResolverState) =>
    selectors.totalRelatedEventCountForNode(state)(nodeID)
  );

  const eventsInCategoryCount = useSelector((state: ResolverState) =>
    selectors.relatedEventCountOfTypeForNode(state)(nodeID, eventCategory)
  );

  const nodesLinkNavProps = useLinkProps({
    panelView: 'nodes',
  });

  const nodeDetailNavProps = useLinkProps({
    panelView: 'nodeDetail',
    panelParameters: { nodeID },
  });

  const nodeEventsNavProps = useLinkProps({
    panelView: 'nodeEvents',
    panelParameters: { nodeID },
  });

  return (
    <Breadcrumbs
      breadcrumbs={[
        {
          text: i18n.translate(
            'xpack.securitySolution.endpoint.resolver.panel.processEventListByType.events',
            {
              defaultMessage: 'Events',
            }
          ),
          'data-test-subj': 'resolver:node-events-in-category:breadcrumbs:node-list-link',
          ...nodesLinkNavProps,
        },
        {
          text: nodeName,
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
              values={{ count: eventsInCategoryCount, category: eventCategory }}
              defaultMessage="{count} {category}"
            />
          ),
        },
      ]}
    />
  );
});
