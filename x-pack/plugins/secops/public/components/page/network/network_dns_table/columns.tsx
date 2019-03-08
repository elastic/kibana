/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { get, isNil } from 'lodash/fp';
import React from 'react';

import { NetworkDnsEdges } from '../../../../graphql/types';
import { escapeQueryValue } from '../../../../lib/keury';
import { networkModel } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue } from '../../../empty_value';
import { Columns } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';

import * as i18n from './translations';

export const getNetworkDnsColumns = (
  startDate: number,
  type: networkModel.NetworkType
): Array<Columns<NetworkDnsEdges>> => [
  {
    name: i18n.NAME,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: ({ node }) => {
      const name = get('name', node);
      const id = escapeDataProviderId(`networkDns-table--name-${name}`);
      if (!isNil(name)) {
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
                field: 'dns.question.etld_plus_one',
                value: escapeQueryValue(name),
              },
              queryDate: {
                from: startDate,
                to: Date.now(),
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                defaultToEmptyTag(name)
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
    name: i18n.COUNT,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      if (!isNil(node.queryCount)) {
        return numeral(node.queryCount).format('0');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    name: i18n.UNIQUE_DOMAINS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      if (!isNil(node.uniqueDomains)) {
        return numeral(node.uniqueDomains).format('0');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    name: i18n.DNS_BYTES_IN,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      if (!isNil(node.dnsBytesIn)) {
        return numeral(node.dnsBytesIn).format('0.000b');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    name: i18n.DNS_BYTES_IN,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      if (!isNil(node.dnsBytesOut)) {
        return numeral(node.dnsBytesOut).format('0.000b');
      } else {
        return getEmptyTagValue();
      }
    },
  },
];
