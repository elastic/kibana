/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  DragEffects,
  DraggableWrapper,
} from '../../../common/components/drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../common/components/drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { UebaDetailsLink } from '../../../common/components/links';
import { IS_OPERATOR } from '../../../timelines/components/timeline/data_providers/data_provider';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';
import {
  AddFilterToGlobalSearchBar,
  createFilter,
} from '../../../common/components/add_filter_to_global_search_bar';
import { RiskScoreColumns } from './';

import * as i18n from './translations';
export const getRiskScoreColumns = (): RiskScoreColumns => [
  {
    field: 'node.host_name',
    name: i18n.NAME,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (hostName) => {
      if (hostName != null && hostName.length > 0) {
        const id = escapeDataProviderId(`ueba-table-hostName-${hostName}`);
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
              queryMatch: { field: 'host.name', value: hostName, operator: IS_OPERATOR },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <UebaDetailsLink hostName={hostName} />
              )
            }
          />
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'node.risk_keyword',
    name: i18n.CURRENT_RISK,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: (riskKeyword) => {
      if (riskKeyword != null) {
        return (
          <AddFilterToGlobalSearchBar filter={createFilter('risk.keyword', riskKeyword)}>
            <>{riskKeyword}</>
          </AddFilterToGlobalSearchBar>
        );
      }
      return getEmptyTagValue();
    },
  },
];
