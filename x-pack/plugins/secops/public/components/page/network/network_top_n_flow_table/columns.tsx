/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { get, isEmpty } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import {
  NetworkDirectionEcs,
  NetworkTopNFlowDirection,
  NetworkTopNFlowEdges,
  NetworkTopNFlowType,
} from '../../../../graphql/types';
import { escapeQueryValue } from '../../../../lib/keury';
import { networkModel } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue, getOrEmptyTag } from '../../../empty_value';
import { IPDetailsLink } from '../../../links';
import { Columns } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';

import { AddToKql } from './add_to_kql';
import * as i18n from './translations';

export const getNetworkTopNFlowColumns = (
  startDate: number,
  topNFlowDirection: NetworkTopNFlowDirection,
  topNFlowType: NetworkTopNFlowType,
  type: networkModel.NetworkType
): Array<Columns<NetworkTopNFlowEdges>> => [
  {
    name: getIpTitle(topNFlowType),
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const ipAttr = `${topNFlowType}.ip`;
      const ip: string | null = get(ipAttr, node);
      const id = escapeDataProviderId(
        `networkTopNFlow-table--${topNFlowType}-${topNFlowDirection}-ip-${ip}`
      );
      if (ip != null) {
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: ip,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: ipAttr,
                value: ip,
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
                <IPDetailsLink ip={ip} />
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
    name: i18n.DOMAIN,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const domainAttr = `${topNFlowType}.domain`;
      const ipAttr = `${topNFlowType}.ip`;
      const domains: string[] = get(domainAttr, node);
      const ip: string | null = get(ipAttr, node);

      if (Array.isArray(domains) && domains.length > 0) {
        const domain = domains[0];
        const id = escapeDataProviderId(
          `networkTopNFlow-table-${ip}-${topNFlowType}-${topNFlowDirection}-domain-${domain}`
        );
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: domain,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: domainAttr,
                value: domain,
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
                <>
                  {domain}
                  {domains.length > 1 && (
                    <EuiToolTip
                      content={
                        <>
                          {domains.slice(1, 6).map(domainName => (
                            <span key={`${id}-${domainName}`}>
                              {defaultToEmptyTag(domainName)}
                              <br />
                            </span>
                          ))}
                          {domains.slice(1).length > 5 && (
                            <b>
                              <br />
                              {i18n.MORE}
                            </b>
                          )}
                        </>
                      }
                    >
                      <MoreDomains type="eye" />
                    </EuiToolTip>
                  )}
                </>
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
    name: i18n.DIRECTION,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      isEmpty(get('network.direction', node))
        ? getEmptyTagValue()
        : get('network.direction', node).map((direction: NetworkDirectionEcs) => (
            <AddToKql
              key={escapeDataProviderId(
                `networkTopNFlow-table-${topNFlowType}-${topNFlowDirection}-direction-${direction}`
              )}
              content={i18n.FILTER_TO_KQL}
              expression={`network.direction: ${escapeQueryValue(direction)}`}
              type={type}
            >
              {defaultToEmptyTag(direction)}
            </AddToKql>
          )),
  },
  {
    name: i18n.BYTES,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      if (node.network && node.network.bytes) {
        return numeral(node.network.bytes).format('0.000b');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    name: i18n.PACKETS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      if (node.network && node.network.packets) {
        return numeral(node.network.packets).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    name: getUniqueTitle(topNFlowType),
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => getOrEmptyTag(`${topNFlowType}.count`, node),
  },
];

const getIpTitle = (topNFlowType: NetworkTopNFlowType) => {
  if (topNFlowType === NetworkTopNFlowType.source) {
    return i18n.SOURCE_IP;
  } else if (topNFlowType === NetworkTopNFlowType.destination) {
    return i18n.DESTINATION_IP;
  } else if (topNFlowType === NetworkTopNFlowType.client) {
    return i18n.CLIENT_IP;
  } else if (topNFlowType === NetworkTopNFlowType.server) {
    return i18n.SERVER_IP;
  }
  return '';
};

const getUniqueTitle = (topNFlowType: NetworkTopNFlowType) => {
  if (topNFlowType === NetworkTopNFlowType.source) {
    return i18n.UNIQUE_DESTINATION_IP;
  } else if (topNFlowType === NetworkTopNFlowType.destination) {
    return i18n.UNIQUE_SOURCE_IP;
  } else if (topNFlowType === NetworkTopNFlowType.client) {
    return i18n.UNIQUE_SERVER_IP;
  } else if (topNFlowType === NetworkTopNFlowType.server) {
    return i18n.UNIQUE_CLIENT_IP;
  }
  return '';
};

const MoreDomains = styled(EuiIcon)`
  margin-left: 5px;
`;
