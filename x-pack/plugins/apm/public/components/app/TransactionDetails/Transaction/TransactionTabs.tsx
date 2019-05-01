/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { history } from '../../../../utils/history';
import { TransactionMetadata } from '../../../shared/MetadataTable/TransactionMetadata';
import { WaterfallContainer } from './WaterfallContainer';
import { IWaterfall } from './WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

const timelineTab = {
  key: 'timeline',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.timelineLabel', {
    defaultMessage: 'Timeline'
  })
};

const metadataTab = {
  key: 'metadata',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.metadataLabel', {
    defaultMessage: 'Metadata'
  })
};

interface Props {
  transaction: Transaction;
  detailTab: string | undefined;
  waterfall: IWaterfall;
}

export function TransactionTabs({ transaction, detailTab, waterfall }: Props) {
  const tabs = [timelineTab, metadataTab];
  const currentTab = detailTab === metadataTab.key ? metadataTab : timelineTab;

  return (
    <React.Fragment>
      <EuiTabs>
        {tabs.map(({ key, label }) => {
          return (
            <EuiTab
              onClick={() => {
                history.replace({
                  ...history.location,
                  search: fromQuery({
                    ...toQuery(history.location.search),
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
        <WaterfallContainer transaction={transaction} waterfall={waterfall} />
      ) : (
        <TransactionMetadata transaction={transaction} />
      )}
    </React.Fragment>
  );
}
