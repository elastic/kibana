/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';
import moment from 'moment';
import { TlsNode } from '../../../graphql/types';
import { Columns } from '../../../common/components/paginated_table';

import {
  getRowItemDraggables,
  getRowItemDraggable,
} from '../../../common/components/tables/helpers';
import { LocalizedDateTooltip } from '../../../common/components/localized_date_tooltip';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';

import * as i18n from './translations';

export type TlsColumns = [
  Columns<TlsNode>,
  Columns<TlsNode>,
  Columns<TlsNode['_id']>,
  Columns<TlsNode>,
  Columns<TlsNode>
];

export const getTlsColumns = (tableId: string): TlsColumns => [
  {
    field: 'node',
    name: i18n.ISSUER,
    truncateText: false,
    hideForMobile: false,
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
    hideForMobile: false,
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
    hideForMobile: false,
    sortable: true,
    render: (sha1) =>
      getRowItemDraggable({
        rowItem: sha1,
        attrName: 'tls.server_certificate.fingerprint.sha1',
        idPrefix: `${tableId}-${sha1}-table-sha1`,
      }),
  },
  {
    field: 'node',
    name: i18n.JA3_FINGERPRINT,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: ({ _id, ja3 }) =>
      getRowItemDraggables({
        rowItems: ja3,
        attrName: 'tls.fingerprints.ja3.hash',
        idPrefix: `${tableId}-${_id}-table-ja3`,
      }),
  },
  {
    field: 'node',
    name: i18n.VALID_UNTIL,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: ({ _id, notAfter }) =>
      getRowItemDraggables({
        rowItems: notAfter,
        attrName: 'tls.server_certificate.not_after',
        idPrefix: `${tableId}-${_id}-table-notAfter`,
        render: (validUntil) => (
          <LocalizedDateTooltip date={moment(new Date(validUntil)).toDate()}>
            <PreferenceFormattedDate value={new Date(validUntil)} />
          </LocalizedDateTooltip>
        ),
      }),
  },
];
