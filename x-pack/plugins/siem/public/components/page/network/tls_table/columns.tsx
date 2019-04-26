/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TlsNode } from '../../../../graphql/types';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../empty_value';
import { Columns } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';

import * as i18n from './translations';

export const getTlsColumns = (
  tableId: string
): [
  Columns<TlsNode>,
  Columns<TlsNode>,
  Columns<TlsNode['_id']>,
  Columns<TlsNode>,
  Columns<TlsNode['notAfter']>
] => [
  {
    field: 'node',
    name: i18n.ISSUER,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: ({ _id, issuerNames }) => {
      if (issuerNames != null && issuerNames[0] != null) {
        const id = escapeDataProviderId(`${tableId}-${_id}-table-issuerNames-${issuerNames[0]}-`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: issuerNames[0],
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'tls.server_certificate.issuer.common_name',
                value: issuerNames[0],
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <>{issuerNames}</>
              )
            }
          />
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: 'node',
    name: i18n.SUBJECT,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: ({ _id, alternativeNames, commonNames }) => {
      if (alternativeNames != null && alternativeNames[0] != null) {
        const name = alternativeNames[0];
        const id = escapeDataProviderId(`${tableId}-${_id}-table-alternative-name-${name}-`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'tls.server_certificate.alternative_names',
                value: name,
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <>{name}</>
              )
            }
          />
        );
      } else if (commonNames != null && commonNames[0] != null) {
        const name = commonNames[0];
        const id = escapeDataProviderId(`${tableId}-${_id}table-common-name-${name}-`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'tls.server_certificate.subject.common_name',
                value: name,
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <>{name}</>
              )
            }
          />
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: 'node._id',
    name: i18n.SHA1_FINGERPRINT,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: sha1 => {
      if (sha1 != null) {
        const id = escapeDataProviderId(`${tableId}-table-sha1-${sha1}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: sha1,
              excluded: false,
              kqlQuery: '',
              queryMatch: { field: 'tls.server_certificate.fingerprint.sha1', value: sha1 },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <>{sha1}</>
              )
            }
          />
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: 'node',
    name: i18n.JA3_FINGERPRINT,
    truncateText: true,
    hideForMobile: false,
    sortable: false,
    render: ({ _id, ja3 }) => {
      if (ja3 != null && ja3[0] != null) {
        const id = escapeDataProviderId(`${tableId}-${_id}-table-ja3-${ja3[0]}-`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: ja3[0],
              excluded: false,
              kqlQuery: '',
              queryMatch: { field: 'tls.fingerprints.ja3.hash', value: ja3[0] },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <>{ja3}</>
              )
            }
          />
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: 'node.notAfter',
    name: i18n.VALID_UNTIL,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: notAfter => {
      if (notAfter != null && notAfter[0] != null) {
        return <>{notAfter[0]}</>;
      } else {
        return getEmptyTagValue();
      }
    },
  },
];
