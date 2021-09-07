/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isEmpty, isString, uniq } from 'lodash/fp';
import React, { useCallback, useMemo, useContext } from 'react';
import { useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import { FlowTarget } from '../../../../common/search_strategy/security_solution/network';
import {
  DragEffects,
  DraggableWrapper,
} from '../../../common/components/drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../common/components/drag_and_drop/helpers';
import { Content } from '../../../common/components/draggables';
import { getOrEmptyTagFromValue } from '../../../common/components/empty_value';
import { parseQueryValue } from '../../../timelines/components/timeline/body/renderers/parse_query_value';
import {
  DataProvider,
  IS_OPERATOR,
} from '../../../timelines/components/timeline/data_providers/data_provider';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';
import {
  TimelineExpandedDetailType,
  TimelineId,
  TimelineTabs,
} from '../../../../common/types/timeline';
import { activeTimeline } from '../../containers/active_timeline_context';
import { timelineActions } from '../../store/timeline';
import { NetworkDetailsLink } from '../../../common/components/links';
import { StatefulEventContext } from '../../../../../timelines/public';

const getUniqueId = ({
  contextId,
  eventId,
  fieldName,
  address,
}: {
  contextId: string;
  eventId: string;
  fieldName: string;
  address: string | object | null | undefined;
}) => `formatted-ip-data-provider-${contextId}-${fieldName}-${address}-${eventId}`;

const tryStringify = (value: string | object | null | undefined): string => {
  try {
    return JSON.stringify(value);
  } catch (_) {
    return `${value}`;
  }
};

const getDataProvider = ({
  contextId,
  eventId,
  fieldName,
  address,
}: {
  contextId: string;
  eventId: string;
  fieldName: string;
  address: string | object | null | undefined;
}): DataProvider => ({
  enabled: true,
  id: escapeDataProviderId(getUniqueId({ contextId, eventId, fieldName, address })),
  name: `${fieldName}: ${parseQueryValue(address)}`,
  queryMatch: {
    field: fieldName,
    value: parseQueryValue(address),
    operator: IS_OPERATOR,
  },
  excluded: false,
  kqlQuery: '',
  and: [],
});

const NonDecoratedIpComponent: React.FC<{
  contextId: string;
  eventId: string;
  fieldName: string;
  isDraggable: boolean;
  truncate?: boolean;
  value: string | object | null | undefined;
}> = ({ contextId, eventId, fieldName, isDraggable, truncate, value }) => {
  const key = useMemo(
    () =>
      `non-decorated-ip-draggable-wrapper-${getUniqueId({
        contextId,
        eventId,
        fieldName,
        address: value,
      })}`,
    [contextId, eventId, fieldName, value]
  );

  const dataProviderProp = useMemo(
    () => getDataProvider({ contextId, eventId, fieldName, address: value }),
    [contextId, eventId, fieldName, value]
  );

  const content = useMemo(
    () =>
      typeof value !== 'object'
        ? getOrEmptyTagFromValue(value)
        : getOrEmptyTagFromValue(tryStringify(value)),
    [value]
  );

  const render = useCallback(
    (dataProvider, _, snapshot) =>
      snapshot.isDragging ? (
        <DragEffects>
          <Provider dataProvider={dataProvider} />
        </DragEffects>
      ) : (
        content
      ),
    [content]
  );

  if (!isDraggable) {
    return content;
  }

  return (
    <DraggableWrapper
      dataProvider={dataProviderProp}
      isDraggable={isDraggable}
      key={key}
      render={render}
      truncate={truncate}
    />
  );
};

const NonDecoratedIp = React.memo(NonDecoratedIpComponent);

interface AddressLinksItemProps extends Omit<AddressLinksProps, 'addresses'> {
  address: string;
}

const AddressLinksItemComponent: React.FC<AddressLinksItemProps> = ({
  address,
  contextId,
  eventId,
  fieldName,
  isDraggable,
  truncate,
}) => {
  const key = `address-links-draggable-wrapper-${getUniqueId({
    contextId,
    eventId,
    fieldName,
    address,
  })}`;

  const dataProviderProp = useMemo(
    () => getDataProvider({ contextId, eventId, fieldName, address }),
    [address, contextId, eventId, fieldName]
  );

  const dispatch = useDispatch();
  const eventContext = useContext(StatefulEventContext);
  const isInTimelineContext =
    address && eventContext?.enableIpDetailsFlyout && eventContext?.timelineID;

  const openNetworkDetailsSidePanel = useCallback(
    (e) => {
      e.preventDefault();
      if (eventContext && isInTimelineContext) {
        const { tabType, timelineID } = eventContext;
        const updatedExpandedDetail: TimelineExpandedDetailType = {
          panelView: 'networkDetail',
          params: {
            ip: address,
            flowTarget: fieldName.includes(FlowTarget.destination)
              ? FlowTarget.destination
              : FlowTarget.source,
          },
        };

        dispatch(
          timelineActions.toggleDetailPanel({
            ...updatedExpandedDetail,
            tabType,
            timelineId: timelineID,
          })
        );

        if (timelineID === TimelineId.active && tabType === TimelineTabs.query) {
          activeTimeline.toggleExpandedDetail({ ...updatedExpandedDetail });
        }
      }
    },
    [eventContext, isInTimelineContext, address, fieldName, dispatch]
  );

  // The below is explicitly defined this way as the onClick takes precedence when it and the href are both defined
  // When this component is used outside of timeline/alerts table (i.e. in the flyout) we would still like it to link to the IP Overview page
  const content = useMemo(
    () => (
      <Content field={fieldName} tooltipContent={fieldName}>
        <NetworkDetailsLink
          ip={address}
          isButton={false}
          onClick={isInTimelineContext ? openNetworkDetailsSidePanel : undefined}
        />
      </Content>
    ),
    [address, fieldName, isInTimelineContext, openNetworkDetailsSidePanel]
  );

  const render = useCallback(
    (_props, _provided, snapshot) =>
      snapshot.isDragging ? (
        <DragEffects>
          <Provider dataProvider={dataProviderProp} />
        </DragEffects>
      ) : (
        content
      ),
    [dataProviderProp, content]
  );

  if (!isDraggable) {
    return content;
  }

  return (
    <DraggableWrapper
      dataProvider={dataProviderProp}
      isDraggable={isDraggable}
      key={key}
      render={render}
      truncate={truncate}
    />
  );
};

const AddressLinksItem = React.memo(AddressLinksItemComponent);

interface AddressLinksProps {
  addresses: string[];
  contextId: string;
  eventId: string;
  fieldName: string;
  isDraggable: boolean;
  truncate?: boolean;
}

const AddressLinksComponent: React.FC<AddressLinksProps> = ({
  addresses,
  contextId,
  eventId,
  fieldName,
  isDraggable,
  truncate,
}) => {
  const uniqAddresses = useMemo(() => uniq(addresses), [addresses]);

  const content = useMemo(
    () =>
      uniqAddresses.map((address) => (
        <AddressLinksItem
          key={address}
          address={address}
          contextId={contextId}
          eventId={eventId}
          fieldName={fieldName}
          isDraggable={isDraggable}
          truncate={truncate}
        />
      )),
    [contextId, eventId, fieldName, isDraggable, truncate, uniqAddresses]
  );

  return <>{content}</>;
};

const AddressLinks = React.memo(
  AddressLinksComponent,
  (prevProps, nextProps) =>
    prevProps.contextId === nextProps.contextId &&
    prevProps.eventId === nextProps.eventId &&
    prevProps.fieldName === nextProps.fieldName &&
    prevProps.isDraggable === nextProps.isDraggable &&
    prevProps.truncate === nextProps.truncate &&
    deepEqual(prevProps.addresses, nextProps.addresses)
);

const FormattedIpComponent: React.FC<{
  contextId: string;
  eventId: string;
  fieldName: string;
  isDraggable: boolean;
  truncate?: boolean;
  value: string | object | null | undefined;
}> = ({ contextId, eventId, fieldName, isDraggable, truncate, value }) => {
  if (isString(value) && !isEmpty(value)) {
    try {
      const addresses = JSON.parse(value);
      if (isArray(addresses)) {
        return (
          <AddressLinks
            addresses={addresses}
            contextId={contextId}
            eventId={eventId}
            fieldName={fieldName}
            isDraggable={isDraggable}
            truncate={truncate}
          />
        );
      }
    } catch (_) {
      // fall back to formatting it as a single link
    }

    // return a single draggable link
    return (
      <AddressLinks
        addresses={[value]}
        contextId={contextId}
        eventId={eventId}
        isDraggable={isDraggable}
        fieldName={fieldName}
        truncate={truncate}
      />
    );
  } else {
    return (
      <NonDecoratedIp
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        isDraggable={isDraggable}
        truncate={truncate}
        value={value}
      />
    );
  }
};

export const FormattedIp = React.memo(
  FormattedIpComponent,
  (prevProps, nextProps) =>
    prevProps.contextId === nextProps.contextId &&
    prevProps.eventId === nextProps.eventId &&
    prevProps.fieldName === nextProps.fieldName &&
    prevProps.isDraggable === nextProps.isDraggable &&
    prevProps.truncate === nextProps.truncate &&
    deepEqual(prevProps.value, nextProps.value)
);
