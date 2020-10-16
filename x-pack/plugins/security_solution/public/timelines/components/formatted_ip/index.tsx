/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isArray, isEmpty, isString, uniq } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

import {
  DragEffects,
  DraggableWrapper,
} from '../../../common/components/drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../common/components/drag_and_drop/helpers';
import { Content } from '../../../common/components/draggables';
import { getOrEmptyTagFromValue } from '../../../common/components/empty_value';
import { NetworkDetailsLink } from '../../../common/components/links';
import { parseQueryValue } from '../../../timelines/components/timeline/body/renderers/parse_query_value';
import {
  DataProvider,
  IS_OPERATOR,
} from '../../../timelines/components/timeline/data_providers/data_provider';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';

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
  truncate?: boolean;
  value: string | object | null | undefined;
}> = ({ contextId, eventId, fieldName, truncate, value }) => {
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

  const render = useCallback(
    (dataProvider, _, snapshot) =>
      snapshot.isDragging ? (
        <DragEffects>
          <Provider dataProvider={dataProvider} />
        </DragEffects>
      ) : typeof value !== 'object' ? (
        getOrEmptyTagFromValue(value)
      ) : (
        getOrEmptyTagFromValue(tryStringify(value))
      ),
    [value]
  );

  return (
    <DraggableWrapper
      dataProvider={dataProviderProp}
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
  truncate,
}) => {
  const key = useMemo(
    () =>
      `address-links-draggable-wrapper-${getUniqueId({
        contextId,
        eventId,
        fieldName,
        address,
      })}`,
    [address, contextId, eventId, fieldName]
  );

  const dataProviderProp = useMemo(
    () => getDataProvider({ contextId, eventId, fieldName, address }),
    [address, contextId, eventId, fieldName]
  );

  const render = useCallback(
    (_props, _provided, snapshot) =>
      snapshot.isDragging ? (
        <DragEffects>
          <Provider dataProvider={dataProviderProp} />
        </DragEffects>
      ) : (
        <Content field={fieldName} tooltipContent={address}>
          <NetworkDetailsLink data-test-subj="network-details" ip={address} />
        </Content>
      ),
    [address, dataProviderProp, fieldName]
  );

  return (
    <DraggableWrapper
      dataProvider={dataProviderProp}
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
  truncate?: boolean;
}

const AddressLinksComponent: React.FC<AddressLinksProps> = ({
  addresses,
  contextId,
  eventId,
  fieldName,
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
          truncate={truncate}
        />
      )),
    [contextId, eventId, fieldName, truncate, uniqAddresses]
  );

  return <>{content}</>;
};

const AddressLinks = React.memo(AddressLinksComponent);

const FormattedIpComponent: React.FC<{
  contextId: string;
  eventId: string;
  fieldName: string;
  truncate?: boolean;
  value: string | object | null | undefined;
}> = ({ contextId, eventId, fieldName, truncate, value }) => {
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
        truncate={truncate}
        value={value}
      />
    );
  }
};

export const FormattedIp = React.memo(FormattedIpComponent);
