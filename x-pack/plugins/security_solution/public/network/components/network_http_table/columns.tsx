/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';
import numeral from '@elastic/numeral';
import { NetworkHttpEdges, NetworkHttpFields, NetworkHttpItem } from '../../../graphql/types';
import { escapeDataProviderId } from '../../../common/components/drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { IPDetailsLink } from '../../../common/components/links';
import { Columns } from '../../../common/components/paginated_table';

import * as i18n from './translations';
import {
  getRowItemDraggable,
  getRowItemDraggables,
} from '../../../common/components/tables/helpers';
export type NetworkHttpColumns = [
  Columns<NetworkHttpEdges>,
  Columns<NetworkHttpEdges>,
  Columns<NetworkHttpItem['path']>,
  Columns<NetworkHttpEdges>,
  Columns<NetworkHttpEdges>,
  Columns<NetworkHttpEdges>,
  Columns<NetworkHttpItem['requestCount']>
];

export const getNetworkHttpColumns = (tableId: string): NetworkHttpColumns => [
  {
    name: i18n.METHOD,
    render: ({ node: { methods, path } }) => {
      return Array.isArray(methods) && methods.length > 0
        ? getRowItemDraggables({
            attrName: 'http.request.method',
            displayCount: 3,
            idPrefix: escapeDataProviderId(`${tableId}-table-methods-${path}`),
            rowItems: methods,
          })
        : getEmptyTagValue();
    },
  },
  {
    name: i18n.DOMAIN,
    render: ({ node: { domains, path } }) =>
      Array.isArray(domains) && domains.length > 0
        ? getRowItemDraggables({
            attrName: 'url.domain',
            displayCount: 3,
            idPrefix: escapeDataProviderId(`${tableId}-table-domains-${path}`),
            rowItems: domains,
          })
        : getEmptyTagValue(),
  },
  {
    field: `node.${NetworkHttpFields.path}`,
    name: i18n.PATH,
    render: (path) =>
      path != null
        ? getRowItemDraggable({
            attrName: 'url.path',
            idPrefix: escapeDataProviderId(`${tableId}-table-path-${path}`),
            rowItem: path,
          })
        : getEmptyTagValue(),
  },
  {
    name: i18n.STATUS,
    render: ({ node: { statuses, path } }) =>
      Array.isArray(statuses) && statuses.length > 0
        ? getRowItemDraggables({
            attrName: 'http.response.status_code',
            displayCount: 3,
            idPrefix: escapeDataProviderId(`${tableId}-table-statuses-${path}`),
            rowItems: statuses,
          })
        : getEmptyTagValue(),
  },
  {
    name: i18n.LAST_HOST,
    render: ({ node: { lastHost, path } }) =>
      lastHost != null
        ? getRowItemDraggable({
            attrName: 'host.name',
            idPrefix: escapeDataProviderId(`${tableId}-table-lastHost-${path}`),
            rowItem: lastHost,
          })
        : getEmptyTagValue(),
  },
  {
    name: i18n.LAST_SOURCE_IP,
    render: ({ node: { lastSourceIp, path } }) =>
      lastSourceIp != null
        ? getRowItemDraggable({
            attrName: 'source.ip',
            idPrefix: escapeDataProviderId(`${tableId}-table-lastSourceIp-${path}`),
            rowItem: lastSourceIp,
            render: () => <IPDetailsLink ip={lastSourceIp} />,
          })
        : getEmptyTagValue(),
  },
  {
    align: 'right',
    field: `node.${NetworkHttpFields.requestCount}`,
    name: i18n.REQUESTS,
    sortable: true,
    render: (requestCount) => {
      if (requestCount != null) {
        return numeral(requestCount).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
];
