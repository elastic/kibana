/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiCallOut, EuiSpacer, EuiHorizontalRule, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FiltersExpressionsSelect, StatusExpressionSelect } from '../monitor_expressions';
import { AddFilterButton } from './add_filter_btn';
import { OldAlertCallOut } from './old_alert_call_out';
import { AvailabilityExpressionSelect } from '../monitor_expressions/availability_expression_select';
import { AlertQueryBar } from '../alert_query_bar/query_bar';
import { useGetUrlParams } from '../../../../hooks';
import { FILTER_FIELDS } from '../../../../../common/constants';

export interface AlertMonitorStatusProps {
  ruleParams: { [key: string]: any };
  enabled: boolean;
  isOldAlert: boolean;
  snapshotCount: number;
  snapshotLoading?: boolean;
  numTimes: number;
  setRuleParams: (key: string, value: any) => void;
  timerange: {
    from: string;
    to: string;
  };
}

export const hasFilters = (filters?: { [key: string]: string[] }) => {
  if (!filters || Object.keys(filters).length === 0) {
    return false;
  }

  return Object.values(FILTER_FIELDS).some((f) => filters[f].length);
};

export const AlertMonitorStatusComponent: React.FC<AlertMonitorStatusProps> = (props) => {
  const { ruleParams, isOldAlert, setRuleParams, snapshotCount, snapshotLoading } = props;

  const alertFilters = ruleParams?.filters ?? {};
  const [newFilters, setNewFilters] = useState<string[]>(
    Object.keys(alertFilters).filter((f) => alertFilters[f].length)
  );

  const { search = '' } = useGetUrlParams();

  useEffect(() => {
    if (search) {
      setRuleParams('search', search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearchChange = useCallback(
    (value: string) => {
      setRuleParams('search', value);
    },
    [setRuleParams]
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

      <AlertQueryBar query={ruleParams.search || ''} onChange={onSearchChange} />

      <EuiSpacer size="s" />

      <AddFilterButton
        alertFilters={ruleParams.filters}
        newFilters={newFilters}
        onNewFilter={(newFilter) => {
          setNewFilters([...newFilters, newFilter]);
        }}
      />

      <FiltersExpressionsSelect
        ruleParams={ruleParams}
        newFilters={newFilters}
        onRemoveFilter={(removeFilter: string) => {
          if (newFilters.includes(removeFilter)) {
            setNewFilters(newFilters.filter((item) => item !== removeFilter));
          }
        }}
        setRuleParams={setRuleParams}
        shouldUpdateUrl={false}
      />

      <EuiHorizontalRule />

      <StatusExpressionSelect
        ruleParams={ruleParams}
        setRuleParams={setRuleParams}
        hasFilters={hasFilters(ruleParams?.filters)}
      />

      <EuiHorizontalRule />

      <AvailabilityExpressionSelect
        ruleParams={ruleParams}
        isOldAlert={isOldAlert}
        setRuleParams={setRuleParams}
        hasFilters={hasFilters(ruleParams?.filters)}
      />

      <EuiSpacer size="m" />
    </>
  );
};
