/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { Location } from 'history';
import React from 'react';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { fromQuery, history, toQuery } from '../../../shared/Links/url_helpers';
import { PropertiesTable } from '../../../shared/PropertiesTable';

interface Props {
  location: Location;
  transaction: Transaction;
}

export const TransactionPropertiesTableForFlyout: React.SFC<Props> = ({
  location,
  transaction
}) => {
  const metadataTab = { key: 'metadata', label: 'Metadata' };
  const tabs = [metadataTab];
  const currentTab = metadataTab;

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
      <PropertiesTable item={transaction} />
    </div>
  );
};
