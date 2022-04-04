/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash/fp';
import React from 'react';

import { DragEffects, DraggableWrapper } from '../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { getEmptyTagValue } from '../empty_value';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { Columns, ItemsPerRow } from '../paginated_table';
import { IS_OPERATOR } from '../../../timelines/components/timeline/data_providers/data_provider';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';
import { getRowItemDraggables } from '../tables/helpers';

import * as i18n from './translations';
import { HostDetailsLink, NetworkDetailsLink, UserDetailsLink } from '../links';
import { AuthenticationsEdges } from '../../../../common/search_strategy';
import { AuthTableColumns } from './types';

export const getHostDetailsAuthenticationColumns = (usersEnabled: boolean): AuthTableColumns => [
  getUserColumn(usersEnabled),
  SUCCESS_COLUMN,
  FAILURES_COLUMN,
  LAST_SUCCESSFUL_TIME_COLUMN,
  LAST_SUCCESSFUL_SOURCE_COLUMN,
  LAST_FAILED_TIME_COLUMN,
  LAST_FAILED_SOURCE_COLUMN,
];

export const getHostsPageAuthenticationColumns = (usersEnabled: boolean): AuthTableColumns => [
  getUserColumn(usersEnabled),
  SUCCESS_COLUMN,
  FAILURES_COLUMN,
  LAST_SUCCESSFUL_TIME_COLUMN,
  LAST_SUCCESSFUL_SOURCE_COLUMN,
  LAST_SUCCESSFUL_DESTINATION_COLUMN,
  LAST_FAILED_TIME_COLUMN,
  LAST_FAILED_SOURCE_COLUMN,
  LAST_FAILED_DESTINATION_COLUMN,
];

export const getUsersPageAuthenticationColumns = (): AuthTableColumns =>
  getHostsPageAuthenticationColumns(true);

export const getUserDetailsAuthenticationColumns = (): AuthTableColumns => [
  HOST_COLUMN,
  SUCCESS_COLUMN,
  FAILURES_COLUMN,
  LAST_SUCCESSFUL_TIME_COLUMN,
  LAST_SUCCESSFUL_SOURCE_COLUMN,
  LAST_FAILED_TIME_COLUMN,
  LAST_FAILED_SOURCE_COLUMN,
];

export const rowItems: ItemsPerRow[] = [
  {
    text: i18n.ROWS_5,
    numberOfRow: 5,
  },
  {
    text: i18n.ROWS_10,
    numberOfRow: 10,
  },
];

const FAILURES_COLUMN: Columns<AuthenticationsEdges, AuthenticationsEdges> = {
  name: i18n.FAILURES,
  truncateText: false,
  mobileOptions: { show: true },
  render: ({ node }) => {
    const id = escapeDataProviderId(`authentications-table-${node._id}-failures-${node.failures}`);
    return (
      <DraggableWrapper
        key={id}
        dataProvider={{
          and: [],
          enabled: true,
          id,
          name: 'authentication_failure',
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field: 'event.type',
            value: 'authentication_failure',
            operator: IS_OPERATOR,
          },
        }}
        render={(dataProvider, _, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider dataProvider={dataProvider} />
            </DragEffects>
          ) : (
            node.failures
          )
        }
      />
    );
  },
  width: '8%',
};
const LAST_SUCCESSFUL_TIME_COLUMN: Columns<AuthenticationsEdges, AuthenticationsEdges> = {
  name: i18n.LAST_SUCCESSFUL_TIME,
  truncateText: false,
  mobileOptions: { show: true },
  render: ({ node }) =>
    has('lastSuccess.timestamp', node) && node.lastSuccess?.timestamp != null ? (
      <FormattedRelativePreferenceDate value={node.lastSuccess?.timestamp} />
    ) : (
      getEmptyTagValue()
    ),
};
const LAST_SUCCESSFUL_SOURCE_COLUMN: Columns<AuthenticationsEdges, AuthenticationsEdges> = {
  name: i18n.LAST_SUCCESSFUL_SOURCE,
  truncateText: false,
  mobileOptions: { show: true },
  render: ({ node }) =>
    getRowItemDraggables({
      rowItems: node.lastSuccess?.source?.ip || null,
      attrName: 'source.ip',
      idPrefix: `authentications-table-${node._id}-lastSuccessSource`,
      render: (item) => <NetworkDetailsLink ip={item} />,
    }),
};
const LAST_SUCCESSFUL_DESTINATION_COLUMN: Columns<AuthenticationsEdges, AuthenticationsEdges> = {
  name: i18n.LAST_SUCCESSFUL_DESTINATION,
  truncateText: false,
  mobileOptions: { show: true },
  render: ({ node }) =>
    getRowItemDraggables({
      rowItems: node.lastSuccess?.host?.name ?? null,
      attrName: 'host.name',
      idPrefix: `authentications-table-${node._id}-lastSuccessfulDestination`,
      render: (item) => <HostDetailsLink hostName={item} />,
    }),
};
const LAST_FAILED_TIME_COLUMN: Columns<AuthenticationsEdges, AuthenticationsEdges> = {
  name: i18n.LAST_FAILED_TIME,
  truncateText: false,
  mobileOptions: { show: true },
  render: ({ node }) =>
    has('lastFailure.timestamp', node) && node.lastFailure?.timestamp != null ? (
      <FormattedRelativePreferenceDate value={node.lastFailure?.timestamp} />
    ) : (
      getEmptyTagValue()
    ),
};
const LAST_FAILED_SOURCE_COLUMN: Columns<AuthenticationsEdges, AuthenticationsEdges> = {
  name: i18n.LAST_FAILED_SOURCE,
  truncateText: false,
  mobileOptions: { show: true },
  render: ({ node }) =>
    getRowItemDraggables({
      rowItems: node.lastFailure?.source?.ip || null,
      attrName: 'source.ip',
      idPrefix: `authentications-table-${node._id}-lastFailureSource`,
      render: (item) => <NetworkDetailsLink ip={item} />,
    }),
};
const LAST_FAILED_DESTINATION_COLUMN: Columns<AuthenticationsEdges, AuthenticationsEdges> = {
  name: i18n.LAST_FAILED_DESTINATION,
  truncateText: false,
  mobileOptions: { show: true },
  render: ({ node }) =>
    getRowItemDraggables({
      rowItems: node.lastFailure?.host?.name || null,
      attrName: 'host.name',
      idPrefix: `authentications-table-${node._id}-lastFailureDestination`,
      render: (item) => <HostDetailsLink hostName={item} />,
    }),
};

const getUserColumn = (
  usersEnabled: boolean
): Columns<AuthenticationsEdges, AuthenticationsEdges> => ({
  name: i18n.USER,
  truncateText: false,
  mobileOptions: { show: true },
  render: ({ node }) =>
    getRowItemDraggables({
      rowItems: node.stackedValue,
      attrName: 'user.name',
      idPrefix: `authentications-table-${node._id}-userName`,
      render: (item) => (usersEnabled ? <UserDetailsLink userName={item} /> : <>{item}</>),
    }),
});

const HOST_COLUMN: Columns<AuthenticationsEdges, AuthenticationsEdges> = {
  name: i18n.HOST,
  truncateText: false,
  mobileOptions: { show: true },
  render: ({ node }) =>
    getRowItemDraggables({
      rowItems: node.stackedValue,
      attrName: 'host.name',
      idPrefix: `authentications-table-${node._id}-hostName`,
      render: (item) => <HostDetailsLink hostName={item} />,
    }),
};

const SUCCESS_COLUMN: Columns<AuthenticationsEdges, AuthenticationsEdges> = {
  name: i18n.SUCCESSES,
  truncateText: false,
  mobileOptions: { show: true },
  render: ({ node }) => {
    const id = escapeDataProviderId(
      `authentications-table-${node._id}-node-successes-${node.successes}`
    );
    return (
      <DraggableWrapper
        key={id}
        dataProvider={{
          and: [],
          enabled: true,
          id,
          name: 'authentication_success',
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field: 'event.type',
            value: 'authentication_success',
            operator: IS_OPERATOR,
          },
        }}
        render={(dataProvider, _, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider dataProvider={dataProvider} />
            </DragEffects>
          ) : (
            node.successes
          )
        }
      />
    );
  },
  width: '8%',
};
