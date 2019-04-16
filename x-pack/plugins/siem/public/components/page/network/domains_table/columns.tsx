/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { getOr, isEmpty } from 'lodash/fp';
import moment from 'moment';
import React from 'react';

import {
  DomainsEdges,
  DomainsNode,
  FlowDirection,
  FlowTarget,
  NetworkDirectionEcs,
} from '../../../../graphql/types';
import { assertUnreachable, ValueOf } from '../../../../lib/helpers';
import { escapeQueryValue } from '../../../../lib/keury';
import { networkModel } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue } from '../../../empty_value';
import { PreferenceFormattedDate } from '../../../formatted_date';
import { Columns } from '../../../load_more_table';
import { LocalizedDateTooltip } from '../../../localized_date_tooltip';
import { Provider } from '../../../timeline/data_providers/provider';
import { AddToKql } from '../../add_to_kql';

import * as i18n from './translations';

export const getDomainsColumns = (
  ip: string,
  startDate: number,
  endDate: number,
  flowDirection: FlowDirection,
  flowTarget: FlowTarget,
  type: networkModel.NetworkType,
  tableId: string
): Array<Columns<DomainsEdges | ValueOf<DomainsNode>>> => [
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
              name: domainName,
              excluded: false,
              kqlQuery: '',
              queryMatch: { field: domainNameAttr, value: domainName },
              queryDate: { from: startDate, to: endDate },
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
    name: (
      <EuiToolTip content={i18n.FIRST_LAST_SEEN_TOOLTIP}>
        <span>
          {i18n.FIRST_SEEN}
          <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
        </span>
      </EuiToolTip>
    ),
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const firstSeenAttr = `${flowTarget}.firstSeen`;
      const firstSeen = getOr(null, firstSeenAttr, node);
      if (firstSeen != null) {
        return (
          <LocalizedDateTooltip date={moment(new Date(firstSeen)).toDate()}>
            <PreferenceFormattedDate value={new Date(firstSeen)} />
          </LocalizedDateTooltip>
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    name: (
      <EuiToolTip content={i18n.FIRST_LAST_SEEN_TOOLTIP}>
        <span>
          {i18n.LAST_SEEN}
          <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
        </span>
      </EuiToolTip>
    ),
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const lastSeenAttr = `${flowTarget}.lastSeen`;
      const lastSeen = getOr(null, lastSeenAttr, node);
      if (lastSeen != null) {
        return (
          <LocalizedDateTooltip date={moment(new Date(lastSeen)).toDate()}>
            <PreferenceFormattedDate value={new Date(lastSeen)} />
          </LocalizedDateTooltip>
        );
      }
      return getEmptyTagValue();
    },
  },
];

const getFlowTargetTitle = (flowTarget: FlowTarget): string => {
  switch (flowTarget) {
    case FlowTarget.client:
      return i18n.UNIQUE_CLIENTS;
    case FlowTarget.server:
      return i18n.UNIQUE_SERVERS;
    case FlowTarget.source:
      return i18n.UNIQUE_DESTINATIONS;
    case FlowTarget.destination:
      return i18n.UNIQUE_SOURCES;
  }
  assertUnreachable(flowTarget);
};
