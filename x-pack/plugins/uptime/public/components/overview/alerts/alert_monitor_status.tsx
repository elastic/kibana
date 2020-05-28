/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { DataPublicPluginSetup } from 'src/plugins/data/public';
import * as labels from './translations';
import {
  DownNoExpressionSelect,
  TimeExpressionSelect,
  FiltersExpressionsSelect,
} from './monitor_expressions';

import { AddFilterButton } from './add_filter_btn';
import { KueryBar } from '..';

interface AlertMonitorStatusProps {
  autocomplete: DataPublicPluginSetup['autocomplete'];
  enabled: boolean;
  filters: string;
  locations: string[];
  numTimes: number;
  setAlertParams: (key: string, value: any) => void;
  timerange: {
    from: string;
    to: string;
  };
}

export const AlertMonitorStatusComponent: React.FC<AlertMonitorStatusProps> = (props) => {
  const { filters, setAlertParams } = props;

  const [newFilters, setNewFilters] = useState<string[]>([]);

  return (
    <>
      <EuiSpacer size="m" />
      <KueryBar
        aria-label={labels.ALERT_KUERY_BAR_ARIA}
        autocomplete={props.autocomplete}
        data-test-subj="xpack.uptime.alerts.monitorStatus.filterBar"
      />

      <EuiSpacer size="s" />

      <DownNoExpressionSelect filters={filters} setAlertParams={setAlertParams} />

      <EuiSpacer size="xs" />

      <TimeExpressionSelect setAlertParams={setAlertParams} />

      <EuiSpacer size="xs" />

      <FiltersExpressionsSelect
        setAlertParams={setAlertParams}
        newFilters={newFilters}
        onRemoveFilter={(removeFiler) => {
          if (newFilters.includes(removeFiler)) {
            setNewFilters(newFilters.filter((item) => item !== removeFiler));
          }
        }}
      />

      <EuiSpacer size="xs" />

      <AddFilterButton
        newFilters={newFilters}
        onNewFilter={(newFilter) => {
          setNewFilters([...newFilters, newFilter]);
        }}
      />

      <EuiSpacer size="m" />
    </>
  );
};
