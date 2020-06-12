/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import numeral from '@elastic/numeral';
import React from 'react';
import { IIndexPattern } from 'src/plugins/data/public';

import { CountryFlagAndName } from '../source_destination/country_flag';
import {
  FlowTargetSourceDest,
  NetworkTopCountriesEdges,
  TopNetworkTablesEcsField,
} from '../../../graphql/types';
import { networkModel } from '../../store';
import {
  DragEffects,
  DraggableWrapper,
} from '../../../common/components/drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../common/components/drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { Columns } from '../../../common/components/paginated_table';
import { IS_OPERATOR } from '../../../timelines/components/timeline/data_providers/data_provider';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';
import * as i18n from './translations';
import { PreferenceFormattedBytes } from '../../../common/components/formatted_bytes';

export type NetworkTopCountriesColumns = [
  Columns<NetworkTopCountriesEdges>,
  Columns<TopNetworkTablesEcsField['bytes_in']>,
  Columns<TopNetworkTablesEcsField['bytes_out']>,
  Columns<NetworkTopCountriesEdges>,
  Columns<NetworkTopCountriesEdges>,
  Columns<NetworkTopCountriesEdges>
];

export type NetworkTopCountriesColumnsIpDetails = [
  Columns<NetworkTopCountriesEdges>,
  Columns<TopNetworkTablesEcsField['bytes_in']>,
  Columns<TopNetworkTablesEcsField['bytes_out']>,
  Columns<NetworkTopCountriesEdges>,
  Columns<NetworkTopCountriesEdges>
];

export const getNetworkTopCountriesColumns = (
  indexPattern: IIndexPattern,
  flowTarget: FlowTargetSourceDest,
  type: networkModel.NetworkType,
  tableId: string
): NetworkTopCountriesColumns => [
  {
    name: i18n.COUNTRY,
    render: ({ node }) => {
      const geo = get(`${flowTarget}.country`, node);
      const geoAttr = `${flowTarget}.geo.country_iso_code`;
      const id = escapeDataProviderId(`${tableId}-table-${flowTarget}-country-${geo}`);
      if (geo != null) {
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: geo,
              excluded: false,
              kqlQuery: '',
              queryMatch: { field: geoAttr, value: geo, operator: IS_OPERATOR },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <>
                  <CountryFlagAndName countryCode={geo} />
                </>
              )
            }
          />
        );
      } else {
        return getEmptyTagValue();
      }
    },
    width: '20%',
  },
  {
    align: 'right',
    field: 'node.network.bytes_in',
    name: i18n.BYTES_IN,
    sortable: true,
    render: (bytes) => {
      if (bytes != null) {
        return <PreferenceFormattedBytes value={bytes} />;
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: 'node.network.bytes_out',
    name: i18n.BYTES_OUT,
    sortable: true,
    render: (bytes) => {
      if (bytes != null) {
        return <PreferenceFormattedBytes value={bytes} />;
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${flowTarget}.flows`,
    name: i18n.FLOWS,
    sortable: true,
    render: (flows) => {
      if (flows != null) {
        return numeral(flows).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${flowTarget}.${flowTarget}_ips`,
    name: flowTarget === FlowTargetSourceDest.source ? i18n.SOURCE_IPS : i18n.DESTINATION_IPS,
    sortable: true,
    render: (ips) => {
      if (ips != null) {
        return numeral(ips).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${flowTarget}.${getOppositeField(flowTarget)}_ips`,
    name:
      getOppositeField(flowTarget) === FlowTargetSourceDest.source
        ? i18n.SOURCE_IPS
        : i18n.DESTINATION_IPS,
    sortable: true,
    render: (ips) => {
      if (ips != null) {
        return numeral(ips).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
];

export const getCountriesColumnsCurated = (
  indexPattern: IIndexPattern,
  flowTarget: FlowTargetSourceDest,
  type: networkModel.NetworkType,
  tableId: string
): NetworkTopCountriesColumns | NetworkTopCountriesColumnsIpDetails => {
  const columns = getNetworkTopCountriesColumns(indexPattern, flowTarget, type, tableId);

  // Columns to exclude from host details pages
  if (type === networkModel.NetworkType.details) {
    columns.pop();
    return columns;
  }

  return columns;
};

const getOppositeField = (flowTarget: FlowTargetSourceDest): FlowTargetSourceDest =>
  flowTarget === FlowTargetSourceDest.source
    ? FlowTargetSourceDest.destination
    : FlowTargetSourceDest.source;
