/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSearchBar, EuiSpacer, EuiEmptyPrompt, EuiButton, Query } from '@elastic/eui';
import { useProcessList } from '../../../../hooks/use_process_list';
import { TabContent, TabProps } from '../shared';
import { STATE_NAMES } from './states';
import { SummaryTable } from './summary_table';
import { ProcessesTable } from './processes_table';

const TabComponent = ({ currentTime, node, nodeType, options }: TabProps) => {
  const [searchFilter, setSearchFilter] = useState<Query>(EuiSearchBar.Query.MATCH_ALL);

  const hostTerm = useMemo(() => {
    const field =
      options.fields && Reflect.has(options.fields, nodeType)
        ? Reflect.get(options.fields, nodeType)
        : nodeType;
    return { [field]: node.name };
  }, [options, node, nodeType]);

  const { loading, error, response, makeRequest: reload } = useProcessList(
    hostTerm,
    'metricbeat-*',
    options.fields!.timestamp,
    currentTime
  );

  if (error) {
    return (
      <TabContent>
        <EuiEmptyPrompt
          iconType="tableDensityNormal"
          title={
            <h4>
              {i18n.translate('xpack.infra.metrics.nodeDetails.processListError', {
                defaultMessage: 'Unable to show process data',
              })}
            </h4>
          }
          actions={
            <EuiButton color="primary" fill onClick={reload}>
              {i18n.translate('xpack.infra.metrics.nodeDetails.processListRetry', {
                defaultMessage: 'Try again',
              })}
            </EuiButton>
          }
        />
      </TabContent>
    );
  }

  return (
    <TabContent>
      <SummaryTable isLoading={loading} processList={response ?? []} />
      <EuiSpacer size="m" />
      <EuiSearchBar
        query={searchFilter}
        onChange={({ query }) => setSearchFilter(query ?? EuiSearchBar.Query.MATCH_ALL)}
        box={{
          incremental: true,
          placeholder: i18n.translate('xpack.infra.metrics.nodeDetails.searchForProcesses', {
            defaultMessage: 'Search for processes…',
          }),
        }}
        filters={[
          {
            type: 'field_value_selection',
            field: 'state',
            name: 'State',
            operator: 'exact',
            multiSelect: false,
            options: Object.entries(STATE_NAMES).map(([value, view]: [string, string]) => ({
              value,
              view,
            })),
          },
        ]}
      />
      <EuiSpacer size="m" />
      <ProcessesTable
        currentTime={currentTime}
        isLoading={loading || !response}
        processList={response ?? []}
        searchFilter={searchFilter}
      />
    </TabContent>
  );
};

export const ProcessesTab = {
  id: 'processes',
  name: i18n.translate('xpack.infra.metrics.nodeDetails.tabs.processes', {
    defaultMessage: 'Processes',
  }),
  content: TabComponent,
};
