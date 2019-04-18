/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import { get } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { IUrlParams } from '../../../../store/urlParams';
import { px, units } from '../../../../style/variables';
import { HeightRetainer } from '../../../shared/HeightRetainer';
import { fromQuery, history, toQuery } from '../../../shared/Links/url_helpers';
import { PropertiesTable } from '../../../shared/PropertiesTable';
import {
  getCurrentTab,
  getTabsFromObject
} from '../../../shared/PropertiesTable/tabConfig';
import { WaterfallContainer } from './WaterfallContainer';
import { IWaterfall } from './WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

const TableContainer = styled.div`
  padding: ${px(units.plus)} ${px(units.plus)} 0;
`;

interface TimelineTab {
  key: 'timeline';
  label: string;
}

const timelineTab: TimelineTab = {
  key: 'timeline',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.timelineLabel', {
    defaultMessage: 'Timeline'
  })
};

interface Props {
  location: Location;
  transaction: Transaction;
  urlParams: IUrlParams;
  waterfall: IWaterfall;
}

export function TransactionTabs({
  location,
  transaction,
  urlParams,
  waterfall
}: Props) {
  const tabs = [timelineTab, ...getTabsFromObject(transaction)];
  const currentTab = getCurrentTab(tabs, urlParams.detailTab);
  const agentName = transaction.agent.name;

  return (
    <HeightRetainer
      key={`${transaction.trace.id}:${transaction.transaction.id}`}
    >
      <EuiTabs>
        {tabs.map(({ key, label }) => {
          return (
            <EuiTab
              onClick={() => {
                history.replace({
                  ...location,
                  search: fromQuery({
                    ...toQuery(location.search),
                    detailTab: key
                  })
                });
              }}
              isSelected={currentTab.key === key}
              key={key}
            >
              {label}
            </EuiTab>
          );
        })}
      </EuiTabs>

      <EuiSpacer />

      {currentTab.key === timelineTab.key ? (
        <WaterfallContainer
          transaction={transaction}
          location={location}
          urlParams={urlParams}
          waterfall={waterfall}
        />
      ) : (
        <TableContainer>
          <PropertiesTable
            propData={get(transaction, currentTab.key)}
            propKey={currentTab.key}
            agentName={agentName}
          />
        </TableContainer>
      )}
    </HeightRetainer>
  );
}
