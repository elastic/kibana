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
  FlowDirection,
  FlowTarget,
  NetworkDirectionEcs,
  NetworkTopNFlowEdges,
  NetworkTopNFlowItem,
} from '../../../../graphql/types';
import { assertUnreachable, ValueOf } from '../../../../lib/helpers';
import { escapeQueryValue } from '../../../../lib/keury';
import { networkModel } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue } from '../../../empty_value';
import { IPDetailsLink } from '../../../links';
import { Columns } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';
import { AddToKql } from '../../add_to_kql';

import * as i18n from './translations';

export const getNetworkTopNFlowColumns = (
  flowDirection: FlowDirection,
  flowTarget: FlowTarget,
  type: networkModel.NetworkType,
  tableId: string
): Array<Columns<NetworkTopNFlowEdges | ValueOf<NetworkTopNFlowItem>>> => [
  {
    name: getIpTitle(flowTarget),
    truncateText: false,
    hideForMobile: false,
    render: ({ node }: { node: NetworkTopNFlowItem }) => {
      const ipAttr = `${flowTarget}.ip`;
      const ip: string | null = get(ipAttr, node);
      const id = escapeDataProviderId(`${tableId}-table--${flowTarget}-${flowDirection}-ip-${ip}`);
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
              queryMatch: { field: ipAttr, value: ip },
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
    render: ({ node }: { node: NetworkTopNFlowItem }) => {
      const domainAttr = `${flowTarget}.domain`;
      const ipAttr = `${flowTarget}.ip`;
      const domains: string[] = get(domainAttr, node);
      const ip: string | null = get(ipAttr, node);

      if (Array.isArray(domains) && domains.length > 0) {
        const domain = domains[0];
        const id = escapeDataProviderId(
          `${tableId}-table-${ip}-${flowTarget}-${flowDirection}-domain-${domain}`
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
              queryMatch: { field: domainAttr, value: domain },
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
    field: 'node.network.direction',
    name: i18n.DIRECTION,
    truncateText: false,
    hideForMobile: false,
    render: (directions: NetworkDirectionEcs[] | null | undefined) =>
      isEmpty(directions)
        ? getEmptyTagValue()
        : directions &&
          directions.map((direction, index) => (
            <AddToKql
              key={escapeDataProviderId(
                `${tableId}-table-${flowTarget}-${flowDirection}-direction-${direction}`
              )}
              expression={`network.direction: ${escapeQueryValue(direction)}`}
              componentFilterType="network"
              type={type}
            >
              <>
                {defaultToEmptyTag(direction)}
                {index < directions.length - 1 ? '\u00A0' : null}
              </>
            </AddToKql>
          )),
  },
  {
    field: 'node.network.bytes',
    name: i18n.BYTES,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (bytes: number | null | undefined) => {
      if (bytes != null) {
        return numeral(bytes).format('0.000b');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: 'node.network.packets',
    name: i18n.PACKETS,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (packets: number | null | undefined) => {
      if (packets != null) {
        return numeral(packets).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: `node.${flowTarget}.count`,
    name: getUniqueTitle(flowTarget),
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (ipCount: number | null | undefined) => {
      if (ipCount != null) {
        return numeral(ipCount).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
];

const getIpTitle = (flowTarget: FlowTarget) => {
  switch (flowTarget) {
    case FlowTarget.source:
      return i18n.SOURCE_IP;
    case FlowTarget.destination:
      return i18n.DESTINATION_IP;
    case FlowTarget.client:
      return i18n.CLIENT_IP;
    case FlowTarget.server:
      return i18n.SERVER_IP;
  }
  assertUnreachable(flowTarget);
};

const getUniqueTitle = (flowTarget: FlowTarget) => {
  switch (flowTarget) {
    case FlowTarget.source:
      return i18n.UNIQUE_DESTINATION_IP;
    case FlowTarget.destination:
      return i18n.UNIQUE_SOURCE_IP;
    case FlowTarget.client:
      return i18n.UNIQUE_SERVER_IP;
    case FlowTarget.server:
      return i18n.UNIQUE_CLIENT_IP;
  }
  assertUnreachable(flowTarget);
};

const MoreDomains = styled(EuiIcon)`
  margin-left: 5px;
`;
