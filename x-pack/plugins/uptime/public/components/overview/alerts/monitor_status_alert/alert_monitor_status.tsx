/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiCallOut, EuiSpacer, EuiHorizontalRule, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { FiltersExpressionSelectContainer, StatusExpressionSelect } from '../monitor_expressions';
import { AddFilterButton } from './add_filter_btn';
import { OldAlertCallOut } from './old_alert_call_out';
import { AvailabilityExpressionSelect } from '../monitor_expressions/availability_expression_select';
import { AlertQueryBar } from '../alert_query_bar/query_bar';
import { useGetUrlParams } from '../../../../hooks';

export interface AlertMonitorStatusProps {
  alertParams: { [key: string]: any };
  enabled: boolean;
  hasFilters: boolean;
  isOldAlert: boolean;
  snapshotCount: number;
  snapshotLoading?: boolean;
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

  const { search = '' } = useGetUrlParams();

  useEffect(() => {
    if (search) {
      setAlertParams('search', search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearchChange = useCallback(
    (value: string) => {
      setAlertParams('search', value);
    },
    [setAlertParams]
  );

  return (
    <>
      <OldAlertCallOut isOldAlert={isOldAlert} />

      <EuiCallOut
        size="s"
        title={
          <span>
            <FormattedMessage
              id="xpack.uptime.alerts.monitorStatus.monitorCallOut.title"
              defaultMessage="This alert will apply to approximately {snapshotCount} monitors."
              values={{ snapshotCount: snapshotLoading ? '...' : snapshotCount }}
            />{' '}
            {snapshotLoading && <EuiLoadingSpinner />}
          </span>
        }
        iconType="iInCircle"
      />

      <EuiSpacer size="s" />

      <AlertQueryBar query={alertParams.search || ''} onChange={onSearchChange} />

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
        shouldUpdateUrl={false}
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

      <EuiSpacer size="m" />
    </>
  );
};
