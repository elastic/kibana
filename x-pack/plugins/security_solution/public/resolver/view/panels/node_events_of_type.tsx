/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { useSelector, useDispatch } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';
import { BoldCode, StyledTime } from './styles';
import { Breadcrumbs } from './breadcrumbs';
import * as eventModel from '../../../../common/endpoint/models/event';
import type { SafeResolverEvent } from '../../../../common/endpoint/types';
import * as selectors from '../../store/selectors';
import { PanelLoading } from './panel_loading';
import { DescriptiveName } from './descriptive_name';
import { useLinkProps } from '../use_link_props';
import { useFormattedDate } from './use_formatted_date';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import type { State } from '../../../common/store/types';
import { userRequestedAdditionalRelatedEvents } from '../../store/data/action';

export type NodeEventOnClick = ({
  documentId,
  indexName,
  scopeId,
}: {
  documentId: string | undefined;
  indexName: string | undefined;
  scopeId: string;
}) => () => void;

/**
 * Render a list of events that are related to `nodeID` and that have a category of `eventType`.
 */
// eslint-disable-next-line react/display-name
export const NodeEventsInCategory = memo(function ({
  id,
  nodeID,
  eventCategory,
  nodeEventOnClick,
}: {
  id: string;
  nodeID: string;
  eventCategory: string;
  nodeEventOnClick?: NodeEventOnClick;
}) {
  const node = useSelector((state: State) => selectors.graphNodeForID(state.analyzer[id])(nodeID));
  const isLoading = useSelector((state: State) =>
    selectors.isLoadingNodeEventsInCategory(state.analyzer[id])
  );
  const hasError = useSelector((state: State) =>
    selectors.hadErrorLoadingNodeEventsInCategory(state.analyzer[id])
  );

  return (
    <>
      {isLoading ? (
        <PanelLoading id={id} />
      ) : hasError || !node ? (
        <EuiCallOut
          title={i18n.translate(
            'xpack.securitySolution.endpoint.resolver.panel.nodeEventsByType.errorPrimary',
            {
              defaultMessage: 'Unable to load events.',
            }
          )}
          color="danger"
          iconType="warning"
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
        <div data-test-subj="resolver:panel:events-in-category">
          <NodeEventsInCategoryBreadcrumbs
            id={id}
            nodeName={node.name}
            eventCategory={eventCategory}
            nodeID={nodeID}
          />
          <EuiSpacer size="l" />
          <NodeEventList
            id={id}
            eventCategory={eventCategory}
            nodeID={nodeID}
            nodeEventOnClick={nodeEventOnClick}
          />
        </div>
      )}
    </>
  );
});

/**
 * Rendered for each event in the list.
 */
// eslint-disable-next-line react/display-name
export const NodeEventsListItem = memo(function ({
  id,
  event,
  nodeID,
  eventCategory,
  nodeEventOnClick,
}: {
  id: string;
  event: SafeResolverEvent;
  nodeID: string;
  eventCategory: string;
  nodeEventOnClick?: NodeEventOnClick;
}) {
  const expandedEvent = expandDottedObject(event);
  const timestamp = eventModel.eventTimestamp(expandedEvent);
  const eventID = eventModel.eventID(expandedEvent);
  const documentId = eventModel.documentID(expandedEvent);
  const indexName = eventModel.indexName(expandedEvent);
  const winlogRecordID = eventModel.winlogRecordID(expandedEvent);
  const date =
    useFormattedDate(timestamp) ||
    i18n.translate('xpack.securitySolution.enpdoint.resolver.panelutils.noTimestampRetrieved', {
      defaultMessage: 'No timestamp retrieved',
    });
  const linkProps = useLinkProps(id, {
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
              category: eventModel.eventCategory(expandedEvent).join(', '),
              eventType: eventModel.eventType(expandedEvent).join(', '),
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
      {nodeEventOnClick ? (
        <EuiButtonEmpty
          data-test-subj="resolver:panel:node-events-in-category:event-link"
          onClick={nodeEventOnClick({ documentId, indexName, scopeId: id })}
        >
          <DescriptiveName event={expandedEvent} />
        </EuiButtonEmpty>
      ) : (
        <EuiButtonEmpty
          data-test-subj="resolver:panel:node-events-in-category:event-link"
          {...linkProps}
        >
          <DescriptiveName event={expandedEvent} />
        </EuiButtonEmpty>
      )}
    </>
  );
});

/**
 * Renders a list of events with a separator in between.
 */
const NodeEventList = memo(function NodeEventList({
  id,
  eventCategory,
  nodeID,
  nodeEventOnClick,
}: {
  id: string;
  eventCategory: string;
  nodeID: string;
  nodeEventOnClick?: NodeEventOnClick;
}) {
  const events = useSelector((state: State) => selectors.nodeEventsInCategory(state.analyzer[id]));
  const dispatch = useDispatch();
  const handleLoadMore = useCallback(() => {
    dispatch(userRequestedAdditionalRelatedEvents({ id }));
  }, [dispatch, id]);
  const isLoading = useSelector((state: State) =>
    selectors.isLoadingMoreNodeEventsInCategory(state.analyzer[id])
  );
  const hasMore = useSelector((state: State) =>
    selectors.lastRelatedEventResponseContainsCursor(state.analyzer[id])
  );
  return (
    <>
      {events.map((event, index) => (
        <Fragment key={index}>
          <NodeEventsListItem
            id={id}
            nodeID={nodeID}
            eventCategory={eventCategory}
            event={event}
            nodeEventOnClick={nodeEventOnClick}
          />
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
// eslint-disable-next-line react/display-name
const NodeEventsInCategoryBreadcrumbs = memo(function ({
  id,
  nodeName,
  eventCategory,
  nodeID,
}: {
  id: string;
  nodeName: React.ReactNode;
  eventCategory: string;
  nodeID: string;
}) {
  const eventCount = useSelector((state: State) =>
    selectors.totalRelatedEventCountForNode(state.analyzer[id])(nodeID)
  );

  const eventsInCategoryCount = useSelector((state: State) =>
    selectors.relatedEventCountOfTypeForNode(state.analyzer[id])(nodeID, eventCategory)
  );

  const nodesLinkNavProps = useLinkProps(id, {
    panelView: 'nodes',
  });

  const nodeDetailNavProps = useLinkProps(id, {
    panelView: 'nodeDetail',
    panelParameters: { nodeID },
  });

  const nodeEventsNavProps = useLinkProps(id, {
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
