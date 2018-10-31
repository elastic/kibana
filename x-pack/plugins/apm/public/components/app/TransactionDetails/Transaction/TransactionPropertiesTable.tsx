/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiSpacer,
  // @ts-ignore
  EuiTab,
  // @ts-ignore
  EuiTabs
} from '@elastic/eui';
import { capitalize, first, get } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { Transaction } from '../../../../../typings/Transaction';
import { IUrlParams } from '../../../../store/urlParams';
import { px, units } from '../../../../style/variables';
import { fromQuery, history, toQuery } from '../../../../utils/url';
import {
  getPropertyTabNames,
  PropertiesTable
} from '../../../shared/PropertiesTable';
import { WaterfallContainer } from './WaterfallContainer';

const TableContainer = styled.div`
  padding: ${px(units.plus)} ${px(units.plus)} 0;
`;

// Ensure the selected tab exists or use the first
function getCurrentTab(tabs: string[] = [], selectedTab?: string) {
  return selectedTab && tabs.includes(selectedTab) ? selectedTab : first(tabs);
}

const TIMELINE_TAB = 'timeline';

function getTabs(transactionData: Transaction) {
  const dynamicProps = Object.keys(transactionData.context || {});
  return [TIMELINE_TAB, ...getPropertyTabNames(dynamicProps)];
}

interface TransactionPropertiesTableProps {
  location: any;
  transaction: Transaction;
  urlParams: IUrlParams;
}

export const TransactionPropertiesTable: React.SFC<
  TransactionPropertiesTableProps
> = ({ location, transaction, urlParams }) => {
  const tabs = getTabs(transaction);
  const currentTab = getCurrentTab(tabs, urlParams.detailTab);
  const agentName = transaction.context.service.agent.name;

  return (
    <div>
      <EuiTabs>
        {tabs.map(key => {
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
              isSelected={currentTab === key}
              key={key}
            >
              {capitalize(key)}
            </EuiTab>
          );
        })}
      </EuiTabs>

      <EuiSpacer />

      {currentTab === TIMELINE_TAB && (
        <WaterfallContainer
          transaction={transaction}
          location={location}
          urlParams={urlParams}
        />
      )}

      {currentTab !== TIMELINE_TAB && (
        <TableContainer>
          <PropertiesTable
            propData={get(transaction.context, currentTab)}
            propKey={currentTab}
            agentName={agentName}
          />
        </TableContainer>
      )}
    </div>
  );
};
