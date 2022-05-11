/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { LogStream } from '@kbn/infra-plugin/public';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import type { ApmUrlParams } from '../../../../context/url_params_context/types';
import { fromQuery, toQuery } from '../../../shared/links/url_helpers';
import { TransactionMetadata } from '../../../shared/metadata_table/transaction_metadata';
import { WaterfallContainer } from './waterfall_container';
import { IWaterfall } from './waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';

interface Props {
  transaction: Transaction;
  urlParams: ApmUrlParams;
  waterfall: IWaterfall;
}

export function TransactionTabs({ transaction, urlParams, waterfall }: Props) {
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
                  ...history.location,
                  search: fromQuery({
                    ...toQuery(history.location.search),
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
        urlParams={urlParams}
        waterfall={waterfall}
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
  urlParams,
  waterfall,
}: {
  urlParams: ApmUrlParams;
  waterfall: IWaterfall;
}) {
  return <WaterfallContainer urlParams={urlParams} waterfall={waterfall} />;
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
