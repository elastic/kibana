/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { TransactionMetadata } from '../../../shared/MetadataTable/TransactionMetadata';
import { WaterfallContainer } from './WaterfallContainer';
import { IWaterfall } from './WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';
import { LogStream } from '../../../../../../infra/public';

const timelineTab = {
  key: 'timeline',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.timelineLabel', {
    defaultMessage: 'Timeline',
  }),
};

const metadataTab = {
  key: 'metadata',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.metadataLabel', {
    defaultMessage: 'Metadata',
  }),
};

const logsTab = {
  key: 'logs',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.logsLabel', {
    defaultMessage: 'Logs',
  }),
};

interface Props {
  location: Location;
  transaction: Transaction;
  urlParams: IUrlParams;
  waterfall: IWaterfall;
  exceedsMax: boolean;
}

export function TransactionTabs({
  location,
  transaction,
  urlParams,
  waterfall,
  exceedsMax,
}: Props) {
  const history = useHistory();
  const tabs = [timelineTab, metadataTab, logsTab];
  const currentTab =
    tabs.find((tab) => tab.key === urlParams.detailTab) ?? timelineTab;

  return (
    <React.Fragment>
      <EuiTabs>
        {tabs.map(({ key, label }) => {
          return (
            <EuiTab
              onClick={() => {
                history.replace({
                  ...location,
                  search: fromQuery({
                    ...toQuery(location.search),
                    detailTab: key,
                  }),
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
          location={location}
          urlParams={urlParams}
          waterfall={waterfall}
          exceedsMax={exceedsMax}
        />
      ) : currentTab.key === logsTab.key ? (
        <div>
          <LogStream
            startTimestamp={Date.now() - 86400000}
            endTimestamp={Date.now()}
            query={`trace.id: "${urlParams.traceId}" OR "${urlParams.traceId}"`}
          />
        </div>
      ) : (
        <TransactionMetadata transaction={transaction} />
      )}
    </React.Fragment>
  );
}
