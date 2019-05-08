/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isArray, isEmpty, isString, uniq } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';

import { escapeQueryValue } from '../../lib/keury';
import { DragEffects, DraggableWrapper } from '../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { getOrEmptyTagFromValue } from '../empty_value';
import { IPDetailsLink } from '../links';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { Provider } from '../timeline/data_providers/provider';
import { TruncatableText } from '../truncatable_text';
import { parseQueryValue } from '../timeline/body/renderers/parse_query_value';

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
}) => `id-${contextId}-${fieldName}-${address}-for-event-${eventId}`;

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
    value: escapeQueryValue(parseQueryValue(address)),
  },
  excluded: false,
  kqlQuery: '',
  and: [],
});

const NonDecoratedIp = pure<{
  contextId: string;
  eventId: string;
  fieldName: string;
  value: string | object | null | undefined;
  width?: string;
}>(({ contextId, eventId, fieldName, value, width }) => (
  <DraggableWrapper
    key={getUniqueId({ contextId, eventId, fieldName, address: value })}
    dataProvider={getDataProvider({ contextId, eventId, fieldName, address: value })}
    render={(dataProvider, _, snapshot) =>
      snapshot.isDragging ? (
        <DragEffects>
          <Provider dataProvider={dataProvider} />
        </DragEffects>
      ) : typeof value !== 'object' ? (
        getOrEmptyTagFromValue(value)
      ) : (
        getOrEmptyTagFromValue(tryStringify(value))
      )
    }
    width={width}
  />
));

const AddressLinks = pure<{
  addresses: string[];
  contextId: string;
  eventId: string;
  fieldName: string;
  width?: string;
}>(({ addresses, eventId, contextId, fieldName, width }) => (
  <>
    {uniq(addresses).map(address => (
      <DraggableWrapper
        key={getUniqueId({ contextId, eventId, fieldName, address })}
        dataProvider={getDataProvider({ contextId, eventId, fieldName, address })}
        render={(_, __, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider
                dataProvider={getDataProvider({ contextId, eventId, fieldName, address })}
              />
            </DragEffects>
          ) : width != null ? (
            <IPDetailsLink data-test-sub="truncatable-ip-details-link" ip={address}>
              <TruncatableText data-test-sub="truncatable-ip-details-text" width={width}>
                {address}
              </TruncatableText>
            </IPDetailsLink>
          ) : (
            <IPDetailsLink data-test-sub="ip-details" ip={address} />
          )
        }
        width={width}
      />
    ))}
  </>
));

export const FormattedIp = pure<{
  contextId: string;
  eventId: string;
  fieldName: string;
  value: string | object | null | undefined;
  width?: string;
}>(({ eventId, contextId, fieldName, value, width }) => {
  if (isString(value) && !isEmpty(value)) {
    try {
      const addresses = JSON.parse(value);
      if (isArray(addresses)) {
        return (
          <AddressLinks
            addresses={addresses}
            eventId={eventId}
            contextId={contextId}
            fieldName={fieldName}
            width={width}
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
        eventId={eventId}
        contextId={contextId}
        fieldName={fieldName}
        width={width}
      />
    );
  } else {
    return (
      <NonDecoratedIp
        eventId={eventId}
        contextId={contextId}
        fieldName={fieldName}
        value={value}
        width={width}
      />
    );
  }
});
