/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash/fp';
import React from 'react';

import { getEmptyTagValue } from '../../../common/components/empty_value';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import type { Columns, ItemsPerRow } from '../paginated_table';
import { getRowItemsWithActions } from '../../../common/components/tables/helpers';
import * as i18n from './translations';
import {
  HostDetailsLink,
  NetworkDetailsLink,
  UserDetailsLink,
} from '../../../common/components/links';
import type { AuthenticationsEdges } from '../../../../common/search_strategy';
import type { AuthTableColumns } from './types';
import type {
  MatrixHistogramConfigs,
  MatrixHistogramOption,
} from '../../../common/components/matrix_histogram/types';
import type { LensAttributes } from '../../../common/components/visualization_actions/types';
import { authenticationLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/common/authentication';

export const getHostDetailsAuthenticationColumns = (): AuthTableColumns => [
  USER_COLUMN,
  SUCCESS_COLUMN,
  FAILURES_COLUMN,
  LAST_SUCCESSFUL_TIME_COLUMN,
  LAST_SUCCESSFUL_SOURCE_COLUMN,
  LAST_FAILED_TIME_COLUMN,
  LAST_FAILED_SOURCE_COLUMN,
];

export const getHostsPageAuthenticationColumns = (): AuthTableColumns => [
  USER_COLUMN,
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
  getHostsPageAuthenticationColumns();

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
  field: 'node.failures',
  truncateText: false,
  mobileOptions: { show: true },
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
    getRowItemsWithActions({
      values: node.lastSuccess?.source?.ip || null,
      fieldName: 'source.ip',
      idPrefix: `authentications-table-${node._id}-lastSuccessSource`,
      render: (item) => <NetworkDetailsLink ip={item} />,
    }),
};
const LAST_SUCCESSFUL_DESTINATION_COLUMN: Columns<AuthenticationsEdges, AuthenticationsEdges> = {
  name: i18n.LAST_SUCCESSFUL_DESTINATION,
  truncateText: false,
  mobileOptions: { show: true },
  render: ({ node }) =>
    getRowItemsWithActions({
      values: node.lastSuccess?.host?.name ?? null,
      fieldName: 'host.name',
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
    getRowItemsWithActions({
      values: node.lastFailure?.source?.ip || null,
      fieldName: 'source.ip',
      idPrefix: `authentications-table-${node._id}-lastFailureSource`,
      render: (item) => <NetworkDetailsLink ip={item} />,
    }),
};
const LAST_FAILED_DESTINATION_COLUMN: Columns<AuthenticationsEdges, AuthenticationsEdges> = {
  name: i18n.LAST_FAILED_DESTINATION,
  truncateText: false,
  mobileOptions: { show: true },
  render: ({ node }) =>
    getRowItemsWithActions({
      values: node.lastFailure?.host?.name || null,
      fieldName: 'host.name',
      idPrefix: `authentications-table-${node._id}-lastFailureDestination`,
      render: (item) => <HostDetailsLink hostName={item} />,
    }),
};

const USER_COLUMN: Columns<AuthenticationsEdges, AuthenticationsEdges> = {
  name: i18n.USER,
  truncateText: false,
  mobileOptions: { show: true },
  render: ({ node }) =>
    getRowItemsWithActions({
      values: node.stackedValue,
      fieldName: 'user.name',
      idPrefix: `authentications-table-${node._id}-userName`,
      render: (item) => <UserDetailsLink userName={item} />,
    }),
};

const HOST_COLUMN: Columns<AuthenticationsEdges, AuthenticationsEdges> = {
  name: i18n.HOST,
  truncateText: false,
  mobileOptions: { show: true },
  render: ({ node }) =>
    getRowItemsWithActions({
      values: node.stackedValue,
      fieldName: 'host.name',
      idPrefix: `authentications-table-${node._id}-hostName`,
      render: (item) => <HostDetailsLink hostName={item} />,
    }),
};

const SUCCESS_COLUMN: Columns<AuthenticationsEdges, AuthenticationsEdges> = {
  name: i18n.SUCCESSES,
  field: 'node.successes',
  truncateText: false,
  mobileOptions: { show: true },
  width: '8%',
};

export const authenticationsStackByOptions: MatrixHistogramOption[] = [
  {
    text: 'event.outcome',
    value: 'event.outcome',
  },
];
const DEFAULT_STACK_BY = 'event.outcome';

export const histogramConfigs: MatrixHistogramConfigs = {
  defaultStackByOption:
    authenticationsStackByOptions.find((o) => o.text === DEFAULT_STACK_BY) ??
    authenticationsStackByOptions[0],
  stackByOptions: authenticationsStackByOptions,
  title: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
  lensAttributes: authenticationLensAttributes as LensAttributes,
};
