/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { Location } from 'history';
import { first, get } from 'lodash';
import React from 'react';
import {
  fromQuery,
  history,
  toQuery
} from 'x-pack/plugins/apm/public/components/shared/Links/url_helpers';
import { Transaction } from '../../../../../typings/es_schemas/Transaction';
import { IUrlParams } from '../../../../store/urlParams';
import {
  getPropertyTabNames,
  PropertiesTable,
  Tab
} from '../../../shared/PropertiesTable';

// Ensure the selected tab exists or use the first
function getCurrentTab(tabs: Tab[] = [], selectedTabKey?: string) {
  const selectedTab = tabs.find(({ key }) => key === selectedTabKey);
  return selectedTab ? selectedTab : first(tabs) || {};
}

function getTabs(transactionData: Transaction) {
  const dynamicProps = Object.keys(transactionData.context || {});
  return getPropertyTabNames(dynamicProps);
}

interface Props {
  location: Location;
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
        {tabs.map(({ key, label }) => {
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
              isSelected={currentTab.key === key}
              key={key}
            >
              {label}
            </EuiTab>
          );
        })}
      </EuiTabs>
      <EuiSpacer />
      <PropertiesTable
        propData={get(transaction.context, currentTab.key)}
        propKey={currentTab.key}
        agentName={agentName}
      />
    </div>
  );
};
