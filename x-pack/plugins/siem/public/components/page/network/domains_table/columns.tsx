/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { getOr, isEmpty } from 'lodash/fp';
import React from 'react';

import {
  DomainsEdges,
  DomainsNode,
  FlowDirection,
  FlowTarget,
  NetworkDirectionEcs,
} from '../../../../graphql/types';
import { escapeQueryValue } from '../../../../lib/keury';
import { networkModel } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue } from '../../../empty_value';
import { Columns } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';
import { AddToKql } from '../../add_to_kql';

import { FirstLastSeenDomain } from './first_last_seen';
import * as i18n from './translations';

type valueof<T> = T[keyof T];

export const getDomainsColumns = (
  ip: string,
  startDate: number,
  flowDirection: FlowDirection,
  flowTarget: FlowTarget,
  type: networkModel.NetworkType,
  tableId: string
): Array<Columns<DomainsEdges | valueof<DomainsNode>>> => [
  {
    field: `node.${flowTarget}.domainName`,
    name: i18n.DOMAIN_NAME,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (domainName: string | null) => {
      const domainNameAttr = `${flowTarget}.domainName`;
      if (domainName != null) {
        const id = escapeDataProviderId(
          `${tableId}-table-${flowTarget}-${flowDirection}-domain-${domainName}`
        );
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
              queryMatch: { field: domainNameAttr, value: ip },
              queryDate: { from: startDate, to: Date.now() },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <>{domainName}</>
              )
            }
          />
        );
        // <DefaultDraggable id={id} field={domainNameAttr} value={domainName} />;
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
              type={type}
              componentFilterType={'network'}
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
    field: `node.${flowTarget}.uniqueIpCount`,
    name: getFlowTargetTitle(flowTarget),
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (uniqueIpCount: number | null | undefined) => {
      if (uniqueIpCount != null) {
        return numeral(uniqueIpCount).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    name: i18n.FIRST_SEEN,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const domainNameAttr = `${flowTarget}.domainName`;
      const domainName = getOr(null, domainNameAttr, node);
      if (domainName != null) {
        return (
          <FirstLastSeenDomain
            ip={ip}
            domainName={domainName}
            flowTarget={flowTarget}
            type="first-seen"
          />
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    name: i18n.LAST_SEEN,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const domainNameAttr = `${flowTarget}.domainName`;
      const domainName = getOr(null, domainNameAttr, node);
      if (domainName != null) {
        return (
          <FirstLastSeenDomain
            ip={ip}
            domainName={domainName}
            flowTarget={flowTarget}
            type="last-seen"
          />
        );
      }
      return getEmptyTagValue();
    },
  },
];

const getFlowTargetTitle = (flowTarget: FlowTarget) => {
  if (flowTarget === FlowTarget.source) {
    return i18n.UNIQUE_DESTINATIONS;
  } else if (flowTarget === FlowTarget.destination) {
    return i18n.UNIQUE_SOURCES;
  }
  return '';
};
