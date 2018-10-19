/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { capitalize, first, get } from 'lodash';
import React from 'react';
import { Transaction } from '../../../../../typings/Transaction';
import { IUrlParams } from '../../../../store/urlParams';
// @ts-ignore
import { fromQuery, history, toQuery } from '../../../../utils/url';
import {
  getPropertyTabNames,
  PropertiesTable
} from '../../../shared/PropertiesTable';
// @ts-ignore
import { Tab } from '../../../shared/UIComponents';

// Ensure the selected tab exists or use the first
function getCurrentTab(tabs: string[] = [], selectedTab?: string) {
  return selectedTab && tabs.includes(selectedTab) ? selectedTab : first(tabs);
}

function getTabs(transactionData: Transaction) {
  const dynamicProps = Object.keys(transactionData.context || {});
  return getPropertyTabNames(dynamicProps);
}

interface Props {
  location: any;
  transaction: Transaction;
  urlParams: IUrlParams;
}

export const TransactionPropertiesTableForFlyout: React.SFC<Props> = ({
  location,
  transaction,
  urlParams
}) => {
  const tabs = getTabs(transaction);
  const currentTab = getCurrentTab(tabs, urlParams.flyoutDetailTab);
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
                    flyoutDetailTab: key
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
      <PropertiesTable
        propData={get(transaction.context, currentTab)}
        propKey={currentTab}
        agentName={agentName}
      />
    </div>
  );
};
