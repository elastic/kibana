/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { isNil } from 'lodash/fp';
import React from 'react';

import { NetworkDnsFields, NetworkDnsItem } from '../../../../graphql/types';
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
): Array<Columns<NetworkDnsItem>> => [
  {
    field: `node.${NetworkDnsFields.dnsName}`,
    name: i18n.NAME,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: dnsName => {
      const id = escapeDataProviderId(`networkDns-table--name-${name}`);
      if (!isNil(dnsName)) {
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: dnsName.toString(),
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'dns.question.etld_plus_one',
                value: escapeQueryValue(dnsName.toString()),
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
                defaultToEmptyTag(dnsName)
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
    field: `node.${NetworkDnsFields.queryCount}`,
    name: i18n.TOTAL_QUERIES,
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: queryCount => {
      if (!isNil(queryCount)) {
        return numeral(queryCount).format('0');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: `node.${NetworkDnsFields.uniqueDomains}`,
    name: i18n.UNIQUE_DOMAINS,
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: uniqueDomains => {
      if (!isNil(uniqueDomains)) {
        return numeral(uniqueDomains).format('0');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: `node.${NetworkDnsFields.dnsBytesIn}`,
    name: i18n.DNS_BYTES_IN,
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: dnsBytesIn => {
      if (!isNil(dnsBytesIn)) {
        return numeral(dnsBytesIn).format('0.000b');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: `node.${NetworkDnsFields.dnsBytesOut}`,
    name: i18n.DNS_BYTES_OUT,
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: dnsBytesOut => {
      if (!isNil(dnsBytesOut)) {
        return numeral(dnsBytesOut).format('0.000b');
      } else {
        return getEmptyTagValue();
      }
    },
  },
];
