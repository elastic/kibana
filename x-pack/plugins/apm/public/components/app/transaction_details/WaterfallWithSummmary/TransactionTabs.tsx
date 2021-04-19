/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { LogStream } from '../../../../../../infra/public';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import type { IUrlParams } from '../../../../context/url_params_context/types';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { TransactionMetadata } from '../../../shared/MetadataTable/TransactionMetadata';
import { WaterfallContainer } from './WaterfallContainer';
import { IWaterfall } from './WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

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
    tabs.find(({ key }) => key === urlParams.detailTab) ?? timelineTab;
  const TabContent = currentTab.component;

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

      <TabContent
        location={location}
        urlParams={urlParams}
        waterfall={waterfall}
        exceedsMax={exceedsMax}
        transaction={transaction}
      />
    </React.Fragment>
  );
}

const timelineTab = {
  key: 'timeline',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.timelineLabel', {
    defaultMessage: 'Timeline',
  }),
  component: TimelineTabContent,
};

const metadataTab = {
  key: 'metadata',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.metadataLabel', {
    defaultMessage: 'Metadata',
  }),
  component: MetadataTabContent,
};

const logsTab = {
  key: 'logs',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.logsLabel', {
    defaultMessage: 'Logs',
  }),
  component: LogsTabContent,
};

function TimelineTabContent({
  location,
  urlParams,
  waterfall,
  exceedsMax,
}: {
  location: Location<any>;
  urlParams: IUrlParams;
  waterfall: IWaterfall;
  exceedsMax: boolean;
}) {
  return (
    <WaterfallContainer
      location={location}
      urlParams={urlParams}
      waterfall={waterfall}
      exceedsMax={exceedsMax}
    />
  );
}

function MetadataTabContent({ transaction }: { transaction: Transaction }) {
  return <TransactionMetadata transaction={transaction} />;
}

function LogsTabContent({ transaction }: { transaction: Transaction }) {
  const startTimestamp = Math.floor(transaction.timestamp.us / 1000);
  const endTimestamp = Math.ceil(
    startTimestamp + transaction.transaction.duration.us / 1000
  );
  const framePaddingMs = 1000 * 60 * 60 * 24; // 24 hours
  return (
    <LogStream
      startTimestamp={startTimestamp - framePaddingMs}
      endTimestamp={endTimestamp + framePaddingMs}
      query={`trace.id:"${transaction.trace.id}" OR "${transaction.trace.id}"`}
      height={640}
      columns={[
        { type: 'timestamp' },
        {
          type: 'field',
          field: 'service.name',
          header: i18n.translate(
            'xpack.apm.propertiesTable.tabs.logs.serviceName',
            { defaultMessage: 'Service Name' }
          ),
          width: 200,
        },
        { type: 'message' },
      ]}
    />
  );
}
