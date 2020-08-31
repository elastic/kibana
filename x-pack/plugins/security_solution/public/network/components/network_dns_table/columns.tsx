/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import React from 'react';

import { NetworkDnsFields, NetworkDnsItem } from '../../../graphql/types';
import {
  DragEffects,
  DraggableWrapper,
} from '../../../common/components/drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../common/components/drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue } from '../../../common/components/empty_value';
import { Columns } from '../../../common/components/paginated_table';
import { IS_OPERATOR } from '../../../timelines/components/timeline/data_providers/data_provider';
import { PreferenceFormattedBytes } from '../../../common/components/formatted_bytes';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';

import * as i18n from './translations';
export type NetworkDnsColumns = [
  Columns<NetworkDnsItem['dnsName']>,
  Columns<NetworkDnsItem['queryCount']>,
  Columns<NetworkDnsItem['uniqueDomains']>,
  Columns<NetworkDnsItem['dnsBytesIn']>,
  Columns<NetworkDnsItem['dnsBytesOut']>
];

export const getNetworkDnsColumns = (): NetworkDnsColumns => [
  {
    field: `node.${NetworkDnsFields.dnsName}`,
    name: i18n.REGISTERED_DOMAIN,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (dnsName) => {
      if (dnsName != null) {
        const id = escapeDataProviderId(`networkDns-table--name-${dnsName}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: dnsName,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'dns.question.registered_domain',
                value: dnsName,
                operator: IS_OPERATOR,
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
    align: 'right',
    field: `node.${NetworkDnsFields.queryCount}`,
    name: i18n.TOTAL_QUERIES,
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: (queryCount) => {
      if (queryCount != null) {
        return numeral(queryCount).format('0');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${NetworkDnsFields.uniqueDomains}`,
    name: i18n.UNIQUE_DOMAINS,
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: (uniqueDomains) => {
      if (uniqueDomains != null) {
        return numeral(uniqueDomains).format('0');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${NetworkDnsFields.dnsBytesIn}`,
    name: i18n.DNS_BYTES_IN,
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: (dnsBytesIn) => {
      if (dnsBytesIn != null) {
        return <PreferenceFormattedBytes value={dnsBytesIn} />;
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${NetworkDnsFields.dnsBytesOut}`,
    name: i18n.DNS_BYTES_OUT,
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: (dnsBytesOut) => {
      if (dnsBytesOut != null) {
        return <PreferenceFormattedBytes value={dnsBytesOut} />;
      } else {
        return getEmptyTagValue();
      }
    },
  },
];
