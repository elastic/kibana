/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import { first, get } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import {
  fromQuery,
  history,
  toQuery
} from 'x-pack/plugins/apm/public/components/shared/Links/url_helpers';
import { Transaction } from '../../../../../typings/es_schemas/Transaction';
import { IUrlParams } from '../../../../store/urlParams';
import { px, units } from '../../../../style/variables';
import {
  getPropertyTabNames,
  PropertiesTable
} from '../../../shared/PropertiesTable';
import { Tab } from '../../../shared/PropertiesTable/propertyConfig';
import { WaterfallContainer } from './WaterfallContainer';
import { IWaterfall } from './WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

const TableContainer = styled.div`
  padding: ${px(units.plus)} ${px(units.plus)} 0;
`;

// Ensure the selected tab exists or use the first
function getCurrentTab(tabs: Tab[] = [], selectedTabKey?: string) {
  const selectedTab = tabs.find(({ key }) => key === selectedTabKey);

  return selectedTab ? selectedTab : first(tabs) || {};
}

const timelineTab = {
  key: 'timeline',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.timelineLabel', {
    defaultMessage: 'Timeline'
  })
};

function getTabs(transaction: Transaction) {
  return [timelineTab, ...getPropertyTabNames(transaction)];
}

interface TransactionPropertiesTableProps {
  location: Location;
  transaction: Transaction;
  urlParams: IUrlParams;
  waterfall: IWaterfall;
}

export function TransactionPropertiesTable({
  location,
  transaction,
  urlParams,
  waterfall
}: TransactionPropertiesTableProps) {
  const tabs = getTabs(transaction);
  const currentTab = getCurrentTab(tabs, urlParams.detailTab);
  const agentName = transaction.agent.name;
  const isTimelineTab = currentTab.key === timelineTab.key;

  return (
    <div>
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

      {isTimelineTab ? (
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
    </div>
  );
}
