/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React from 'react';

import { HostItem } from '../../../../graphql/types';
import { ValueOf } from '../../../../lib/helpers';
import { escapeQueryValue } from '../../../../lib/keury';
import { hostsModel } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../empty_value';
import { PreferenceFormattedDate } from '../../../formatted_date';
import { HostDetailsLink } from '../../../links';
import { Columns } from '../../../load_more_table';
import { LocalizedDateTooltip } from '../../../localized_date_tooltip';
import { Provider } from '../../../timeline/data_providers/provider';
import { AddToKql } from '../../add_to_kql';

import * as i18n from './translations';

export const getHostsColumns = (
  startDate: number,
  type: hostsModel.HostsType
): Array<Columns<ValueOf<HostItem>>> => [
  {
    field: 'node.host.name',
    name: i18n.NAME,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (hostName: string | null) => {
      if (hostName != null) {
        const id = escapeDataProviderId(`hosts-table-hostName-${hostName}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              excluded: false,
              id,
              name: hostName,
              kqlQuery: '',
              queryMatch: { field: 'host.name', value: hostName },
              queryDate: { from: startDate, to: Date.now() },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <AddToKql
                  expression={`host.name: ${escapeQueryValue(hostName)}`}
                  componentFilterType="hosts"
                  type={type}
                >
                  <HostDetailsLink hostName={hostName}>{hostName}</HostDetailsLink>
                </AddToKql>
              )
            }
          />
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'node.lastSeen',
    name: i18n.LAST_SEEN,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (lastSeen: string | null) => {
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
  {
    field: 'node.host.os.name',
    name: i18n.OS,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: (hostOsName: string | null) => {
      if (hostOsName != null) {
        return (
          <AddToKql
            expression={`host.os.name: ${escapeQueryValue(hostOsName)}`}
            componentFilterType="hosts"
            type={type}
          >
            <>{hostOsName}</>
          </AddToKql>
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'node.host.os.version',
    name: i18n.VERSION,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: (hostOsVersion: string | null) => {
      if (hostOsVersion != null) {
        return (
          <AddToKql
            expression={`host.os.version: ${escapeQueryValue(hostOsVersion)}`}
            componentFilterType="hosts"
            type={type}
          >
            <>{hostOsVersion}</>
          </AddToKql>
        );
      }
      return getEmptyTagValue();
    },
  },
];
