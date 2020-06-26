/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { DataPublicPluginSetup } from 'src/plugins/data/public';
import * as labels from './translations';
import {
  DownNoExpressionSelect,
  TimeExpressionSelect,
  FiltersExpressionSelectContainer,
} from './monitor_expressions';
import { AddFilterButton } from './add_filter_btn';
import { OldAlertCallOut } from './old_alert_call_out';
import { KueryBar } from '..';

export interface AlertMonitorStatusProps {
  alertParams: { [key: string]: any };
  autocomplete: DataPublicPluginSetup['autocomplete'];
  enabled: boolean;
  hasFilters: boolean;
  isOldAlert: boolean;
  locations: string[];
  selectedFilters: { [key: string]: string[] };
  snapshotCount: number;
  snapshotLoading: boolean;
  numTimes: number;
  setAlertParams: (key: string, value: any) => void;
  timerange: {
    from: string;
    to: string;
  };
}

export const AlertMonitorStatusComponent: React.FC<AlertMonitorStatusProps> = (props) => {
  const {
    alertParams,
    hasFilters,
    isOldAlert,
    setAlertParams,
    selectedFilters,
    snapshotCount,
    snapshotLoading,
  } = props;

  const [newFilters, setNewFilters] = useState<string[]>(
    Object.keys(selectedFilters).filter((f) => selectedFilters[f].length)
  );

  return (
    <>
      <OldAlertCallOut isOldAlert={isOldAlert} />

      <EuiSpacer size="m" />

      <KueryBar
        aria-label={labels.ALERT_KUERY_BAR_ARIA}
        autocomplete={props.autocomplete}
        data-test-subj="xpack.uptime.alerts.monitorStatus.filterBar"
      />

      <EuiSpacer size="s" />

      <DownNoExpressionSelect
        defaultNumTimes={alertParams.numTimes}
        hasFilters={hasFilters}
        setAlertParams={setAlertParams}
      />

      <EuiSpacer size="xs" />

      <TimeExpressionSelect
        defaultTimerangeUnit={alertParams.timerangeUnit}
        defaultTimerangeCount={alertParams.timerangeCount}
        setAlertParams={setAlertParams}
      />

      <EuiSpacer size="xs" />

      <FiltersExpressionSelectContainer
        newFilters={newFilters}
        onRemoveFilter={(removeFilter: string) => {
          if (newFilters.includes(removeFilter)) {
            setNewFilters(newFilters.filter((item) => item !== removeFilter));
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

      <EuiCallOut
        size="s"
        title={
          <FormattedMessage
            id="xpack.uptime.alerts.monitorStatus.monitorCallOut.title"
            defaultMessage="This alert will apply to approximately {snapshotCount} monitors."
            values={{ snapshotCount: snapshotLoading ? '...' : snapshotCount }}
          />
        }
        iconType="iInCircle"
      />

      <EuiSpacer size="m" />
    </>
  );
};
