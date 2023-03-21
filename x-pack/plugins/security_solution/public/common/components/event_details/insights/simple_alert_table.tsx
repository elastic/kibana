/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { EuiBasicTable, EuiLoadingContent, EuiSpacer } from '@elastic/eui';

import { PreferenceFormattedDate } from '../../formatted_date';
import { SeverityBadge } from '../../../../detections/components/rules/severity_badge';
import { useAlertsByIds } from '../../../containers/alerts/use_alerts_by_ids';
import { SIMPLE_ALERT_TABLE_ERROR, SIMPLE_ALERT_TABLE_LIMITED } from './translations';

const TABLE_FIELDS = ['@timestamp', 'kibana.alert.rule.name', 'kibana.alert.severity'];

const columns: Array<EuiBasicTableColumn<Record<string, string[]>>> = [
  {
    field: 'kibana.alert.rule.name',
    name: 'Rule',
  },
  {
    field: '@timestamp',
    name: '@timestamp',
    render: (timestamp: string) => <PreferenceFormattedDate value={new Date(timestamp)} />,
  },
  {
    field: 'kibana.alert.severity',
    name: 'Severity',
    render: (severity: Severity) => <SeverityBadge value={severity} />,
  },
];

/** 10 alert rows in this table has been deemed a balanced amount for the flyout */
const alertLimit = 10;

/**
 * Displays a simplified alert table for the given alert ids.
 * It will only fetch the latest 10 ids and in case more ids
 * are passed in, it will add a note about omitted alerts.
 */
export const SimpleAlertTable = React.memo<{ alertIds: string[] }>(({ alertIds }) => {
  const sampledData = useMemo(() => alertIds.slice(0, alertLimit), [alertIds]);

  const { loading, error, data } = useAlertsByIds({
    alertIds: sampledData,
    fields: TABLE_FIELDS,
  });
  const mappedData = useMemo(() => {
    if (!data) {
      return undefined;
    }
    return data.map((doc) => doc.fields);
  }, [data]);

  if (loading) {
    return <EuiLoadingContent lines={2} />;
  } else if (error) {
    return <>{SIMPLE_ALERT_TABLE_ERROR}</>;
  } else if (mappedData) {
    const showLimitedDataNote = alertIds.length > alertLimit;
    return (
      <>
        {showLimitedDataNote && (
          <div>
            <em>{SIMPLE_ALERT_TABLE_LIMITED}</em>
            <EuiSpacer />
          </div>
        )}
        <EuiBasicTable compressed={true} items={mappedData} columns={columns} />
      </>
    );
  }
  return null;
});

SimpleAlertTable.displayName = 'SimpleAlertTable';
