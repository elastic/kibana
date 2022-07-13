/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { EuiLoadingContent, EuiBasicTable } from '@elastic/eui';

import { PreferenceFormattedDate } from '../../formatted_date';
import { SeverityBadge } from '../../../../detections/components/rules/severity_badge';
import { useAlertsByIds } from '../../../containers/alerts/use_alerts_by_ids';

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

export const SimpleAlertTable = React.memo<{ alertIds: string[] }>(({ alertIds }) => {
  const { loading, error, data } = useAlertsByIds({
    alertIds,
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
    return <>{'Failed to load data'}</>;
  } else if (mappedData) {
    return <EuiBasicTable items={mappedData} columns={columns} />;
  }
  return null;
});

SimpleAlertTable.displayName = 'SimpleAlertTable';
