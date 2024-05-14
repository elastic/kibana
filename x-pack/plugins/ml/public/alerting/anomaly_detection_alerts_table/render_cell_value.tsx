/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import React from 'react';
import type { RenderCellValue } from '@elastic/eui';
import { isDefined } from '@kbn/ml-is-defined';
import { ALERT_DURATION, ALERT_END, ALERT_START } from '@kbn/rule-data-utils';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { getFormattedSeverityScore, getSeverityColor } from '@kbn/ml-anomaly-utils';
import { EuiHealth } from '@elastic/eui';
import {
  alertFieldNameMap,
  ALERT_ANOMALY_SCORE,
  ALERT_ANOMALY_TIMESTAMP,
} from '../../../common/constants/alerts';
import { getFieldFormatterProvider } from '../../application/contexts/kibana/use_field_formatter';

export const getMappedNonEcsValue = ({
  data,
  fieldName,
}: {
  data: any[];
  fieldName: string;
}): string[] | undefined => {
  const item = data.find((d) => d.field === fieldName);
  if (item != null && item.value != null) {
    return item.value;
  }
  return undefined;
};

const getRenderValue = (mappedNonEcsValue: any) => {
  // can be updated when working on https://github.com/elastic/kibana/issues/140819
  const value = Array.isArray(mappedNonEcsValue) ? mappedNonEcsValue.join() : mappedNonEcsValue;

  if (!isEmpty(value)) {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  }

  return '—';
};

export const getRenderCellValue: RenderCellValue = ({ columnId, data, fieldFormats }) => {
  const alertValueFormatter = getAlertFormatters(fieldFormats);
  if (!isDefined(data)) return;

  const mappedNonEcsValue = getMappedNonEcsValue({
    data,
    fieldName: columnId,
  });
  const value = getRenderValue(mappedNonEcsValue);

  return alertValueFormatter(columnId, value);
};

export function getAlertFormatters(fieldFormats: FieldFormatsRegistry) {
  const getFormatter = getFieldFormatterProvider(fieldFormats);

  return (columnId: string, value: string | number | undefined): React.ReactElement => {
    if (!isDefined(value)) return <>{'—'}</>;

    switch (columnId) {
      case ALERT_START:
      case ALERT_END:
      case ALERT_ANOMALY_TIMESTAMP:
        return <>{getFormatter(FIELD_FORMAT_IDS.DATE)(value)}</>;
      case ALERT_DURATION:
        return (
          <>
            {getFormatter(FIELD_FORMAT_IDS.DURATION, {
              inputFormat: 'microseconds',
              outputFormat: 'humanizePrecise',
            })(value)}
          </>
        );
      case ALERT_ANOMALY_SCORE:
        let latestValue: number;
        if (typeof value === 'number') {
          latestValue = value;
        } else {
          const resultValue: number[] = value.split(',').map(Number);
          latestValue = resultValue.at(-1) as number;
        }
        return (
          <EuiHealth textSize={'xs'} color={getSeverityColor(latestValue)}>
            {getFormattedSeverityScore(latestValue)}
          </EuiHealth>
        );
      default:
        return <>{value}</>;
    }
  };
}

export function getAlertEntryFormatter(fieldFormats: FieldFormatsRegistry) {
  const alertValueFormatter = getAlertFormatters(fieldFormats);

  return (columnId: string, value: any): { title: string; description: any } => {
    return {
      title: alertFieldNameMap[columnId],
      description: alertValueFormatter(columnId, value),
    };
  };
}

export type RegisterFormatter = ReturnType<typeof getAlertFormatters>;
