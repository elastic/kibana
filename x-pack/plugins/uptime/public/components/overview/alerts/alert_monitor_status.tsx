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
  FiltersExpressionsSelect,
} from './monitor_expressions';

import { AddFilterButton } from './add_filter_btn';
import { KueryBar } from '..';

interface AlertMonitorStatusProps {
  alertParams: { [key: string]: any };
  autocomplete: DataPublicPluginSetup['autocomplete'];
  enabled: boolean;
  hasFilters: boolean;
  isOldAlert: boolean;
  locations: string[];
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
    snapshotCount,
    snapshotLoading,
  } = props;

  const alertFilters = alertParams?.filters ?? {};
  const [newFilters, setNewFilters] = useState<string[]>(
    Object.keys(alertFilters).filter((f) => alertFilters[f].length)
  );

  return (
    <>
      <EuiSpacer size="m" />

      {isOldAlert && (
        <EuiCallOut
          size="s"
          title={
            <FormattedMessage
              id="xpack.uptime.alerts.monitorStatus.oldAlertCallout.title"
              defaultMessage="You are editing an older alert, some fields may not auto-populate."
            />
          }
          iconType="alert"
        />
      )}

      <EuiSpacer size="m" />

      <KueryBar
        aria-label={labels.ALERT_KUERY_BAR_ARIA}
        autocomplete={props.autocomplete}
        defaultKuery={alertParams.search}
        shouldUpdateUrl={false}
        updateDefaultKuery={(value: string) => setAlertParams('search', value)}
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

      <FiltersExpressionsSelect
        setAlertParams={setAlertParams}
        alertParams={alertParams}
        newFilters={newFilters}
        onRemoveFilter={(removeFiler) => {
          if (newFilters.includes(removeFiler)) {
            setNewFilters(newFilters.filter((item) => item !== removeFiler));
          }
        }}
      />

      <EuiSpacer size="xs" />

      <AddFilterButton
        alertFilters={alertParams.filters}
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
