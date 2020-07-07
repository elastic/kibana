/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiCallOut, EuiSpacer, EuiHorizontalRule } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { DataPublicPluginSetup } from 'src/plugins/data/public';
import * as labels from './translations';
import { FiltersExpressionSelectContainer, StatusExpressionSelect } from './monitor_expressions';
import { AddFilterButton } from './add_filter_btn';
import { OldAlertCallOut } from './old_alert_call_out';
import { AvailabilityExpressionSelect } from './monitor_expressions/availability_expression_select';
import { KueryBar } from '..';

export interface AlertMonitorStatusProps {
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
  shouldUpdateUrl: boolean;
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
    shouldUpdateUrl,
    snapshotCount,
    snapshotLoading,
  } = props;

  const alertFilters = alertParams?.filters ?? {};
  const [newFilters, setNewFilters] = useState<string[]>(
    Object.keys(alertFilters).filter((f) => alertFilters[f].length)
  );

  return (
    <>
      <OldAlertCallOut isOldAlert={isOldAlert} />

      <EuiSpacer size="m" />

      <KueryBar
        aria-label={labels.ALERT_KUERY_BAR_ARIA}
        autocomplete={props.autocomplete}
        defaultKuery={alertParams.search}
        shouldUpdateUrl={shouldUpdateUrl}
        updateDefaultKuery={(value: string) => setAlertParams('search', value)}
        data-test-subj="xpack.uptime.alerts.monitorStatus.filterBar"
      />

      <EuiSpacer size="s" />

      <AddFilterButton
        alertFilters={alertParams.filters}
        newFilters={newFilters}
        onNewFilter={(newFilter) => {
          setNewFilters([...newFilters, newFilter]);
        }}
      />

      <FiltersExpressionSelectContainer
        alertParams={alertParams}
        newFilters={newFilters}
        onRemoveFilter={(removeFilter: string) => {
          if (newFilters.includes(removeFilter)) {
            setNewFilters(newFilters.filter((item) => item !== removeFilter));
          }
        }}
        setAlertParams={setAlertParams}
        shouldUpdateUrl={shouldUpdateUrl}
      />

      <EuiHorizontalRule />

      <StatusExpressionSelect
        alertParams={alertParams}
        hasFilters={hasFilters}
        setAlertParams={setAlertParams}
      />

      <EuiHorizontalRule />

      <AvailabilityExpressionSelect
        alertParams={alertParams}
        isOldAlert={isOldAlert}
        setAlertParams={setAlertParams}
      />

      <EuiSpacer size="l" />

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
