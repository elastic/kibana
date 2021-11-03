/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';

import { NetworkTlsNode } from '../../../../common/search_strategy';
import { Columns } from '../../../common/components/paginated_table';
import {
  getRowItemDraggables,
  getRowItemDraggable,
} from '../../../common/components/tables/helpers';
import { LocalizedDateTooltip } from '../../../common/components/localized_date_tooltip';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';

import * as i18n from './translations';

export type TlsColumns = [
  Columns<NetworkTlsNode>,
  Columns<NetworkTlsNode>,
  Columns<NetworkTlsNode['_id']>,
  Columns<NetworkTlsNode>,
  Columns<NetworkTlsNode>
];

export const getTlsColumns = (tableId: string): TlsColumns => [
  {
    field: 'node',
    name: i18n.ISSUER,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: false,
    render: ({ _id, issuers }) =>
      getRowItemDraggables({
        rowItems: issuers,
        attrName: 'tls.server.issuer',
        idPrefix: `${tableId}-${_id}-table-issuers`,
      }),
  },
  {
    field: 'node',
    name: i18n.SUBJECT,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: false,
    render: ({ _id, subjects }) =>
      getRowItemDraggables({
        rowItems: subjects,
        attrName: 'tls.server.subject',
        idPrefix: `${tableId}-${_id}-table-subjects`,
      }),
  },
  {
    field: 'node._id',
    name: i18n.SHA1_FINGERPRINT,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    render: (sha1) =>
      getRowItemDraggable({
        rowItem: sha1,
        attrName: 'tls.server.hash.sha1',
        idPrefix: `${tableId}-${sha1}-table-sha1`,
      }),
  },
  {
    field: 'node',
    name: i18n.JA3_FINGERPRINT,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: false,
    render: ({ _id, ja3 }) =>
      getRowItemDraggables({
        rowItems: ja3,
        attrName: 'tls.server.ja3s',
        idPrefix: `${tableId}-${_id}-table-ja3`,
      }),
  },
  {
    field: 'node',
    name: i18n.VALID_UNTIL,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: false,
    render: ({ _id, notAfter }) =>
      getRowItemDraggables({
        rowItems: notAfter,
        attrName: 'tls.server.not_after',
        idPrefix: `${tableId}-${_id}-table-notAfter`,
        render: (validUntil) => (
          <LocalizedDateTooltip date={moment(new Date(validUntil)).toDate()}>
            <PreferenceFormattedDate value={new Date(validUntil)} />
          </LocalizedDateTooltip>
        ),
      }),
  },
];
