/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { Location } from 'history';
import { get } from 'lodash';
import React from 'react';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { IUrlParams } from '../../../../store/urlParams';
import { fromQuery, history, toQuery } from '../../../shared/Links/url_helpers';
import { PropertiesTable } from '../../../shared/PropertiesTable';
import {
  getCurrentTab,
  getTabsFromObject
} from '../../../shared/PropertiesTable/tabConfig';

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
  const tabs = getTabsFromObject(transaction);
  const currentTab = getCurrentTab(tabs, urlParams.flyoutDetailTab);
  const agentName = transaction.agent.name;

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
        propData={get(transaction, currentTab.key)}
        propKey={currentTab.key}
        agentName={agentName}
      />
    </div>
  );
};
