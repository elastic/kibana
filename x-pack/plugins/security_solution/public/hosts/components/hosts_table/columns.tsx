/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';
import {
  DragEffects,
  DraggableWrapper,
} from '../../../common/components/drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../common/components/drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { HostDetailsLink } from '../../../common/components/links';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { IS_OPERATOR } from '../../../timelines/components/timeline/data_providers/data_provider';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';
import {
  AddFilterToGlobalSearchBar,
  createFilter,
} from '../../../common/components/add_filter_to_global_search_bar';
import { HostsTableColumns } from './';

import * as i18n from './translations';

export const getHostsColumns = (): HostsTableColumns => [
  {
    field: 'node.host.name',
    name: i18n.NAME,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (hostName) => {
      if (hostName != null && hostName.length > 0) {
        const id = escapeDataProviderId(`hosts-table-hostName-${hostName[0]}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              excluded: false,
              id,
              name: hostName[0],
              kqlQuery: '',
              queryMatch: { field: 'host.name', value: hostName[0], operator: IS_OPERATOR },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <HostDetailsLink hostName={hostName[0]} />
              )
            }
          />
        );
      }
      return getEmptyTagValue();
    },
    width: '35%',
  },
  {
    field: 'node.lastSeen',
    name: (
      <EuiToolTip content={i18n.FIRST_LAST_SEEN_TOOLTIP}>
        <>
          {i18n.LAST_SEEN}{' '}
          <EuiIcon size="s" color="subdued" type="iInCircle" className="eui-alignTop" />
        </>
      </EuiToolTip>
    ),
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (lastSeen) => {
      if (lastSeen != null) {
        return <FormattedRelativePreferenceDate value={lastSeen} />;
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
    render: (hostOsName) => {
      if (hostOsName != null) {
        return (
          <AddFilterToGlobalSearchBar filter={createFilter('host.os.name', hostOsName)}>
            <>{hostOsName}</>
          </AddFilterToGlobalSearchBar>
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
    render: (hostOsVersion) => {
      if (hostOsVersion != null) {
        return (
          <AddFilterToGlobalSearchBar filter={createFilter('host.os.version', hostOsVersion)}>
            <>{hostOsVersion}</>
          </AddFilterToGlobalSearchBar>
        );
      }
      return getEmptyTagValue();
    },
  },
];
