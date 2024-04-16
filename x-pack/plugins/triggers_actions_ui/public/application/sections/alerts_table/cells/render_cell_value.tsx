/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import React from 'react';
import {
  ALERT_DURATION,
  AlertConsumers,
  ALERT_RULE_NAME,
  ALERT_RULE_UUID,
  ALERT_START,
  TIMESTAMP,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_PRODUCER,
} from '@kbn/rule-data-utils';
import {
  FIELD_FORMAT_IDS,
  FieldFormatParams,
  FieldFormatsRegistry,
} from '@kbn/field-formats-plugin/common';
import { EuiBadge, EuiLink, RenderCellValue } from '@elastic/eui';
import { alertProducersData, observabilityFeatureIds } from '../constants';
import { useKibana } from '../../../../common/lib/kibana';

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
  if (data == null) return null;

  const mappedNonEcsValue = getMappedNonEcsValue({
    data,
    fieldName: columnId,
  });
  const value = getRenderValue(mappedNonEcsValue);

  return alertValueFormatter(columnId, value, data);
};

const defaultParam: Record<string, FieldFormatParams> = {
  [FIELD_FORMAT_IDS.DURATION]: {
    inputFormat: 'milliseconds',
    outputFormat: 'humanizePrecise',
  },
  [FIELD_FORMAT_IDS.NUMBER]: {
    pattern: '00.00',
  },
};

export const getFieldFormatterProvider =
  (fieldFormats: FieldFormatsRegistry) =>
  (fieldType: FIELD_FORMAT_IDS, params?: FieldFormatParams) => {
    const fieldFormatter = fieldFormats.deserialize({
      id: fieldType,
      params: params ?? defaultParam[fieldType],
    });
    return fieldFormatter.convert.bind(fieldFormatter);
  };

export function useFieldFormatter(fieldType: FIELD_FORMAT_IDS) {
  const { fieldFormats } = useKibana().services;
  return getFieldFormatterProvider(fieldFormats as FieldFormatsRegistry)(fieldType);
}

const AlertRuleLink = ({ alertFields }: { alertFields: Array<{ field: string; value: any }> }) => {
  const { http } = useKibana().services;
  const ruleName = alertFields.find((f) => f.field === ALERT_RULE_NAME)?.value?.[0];
  const ruleUuid = alertFields.find((f) => f.field === ALERT_RULE_UUID)?.value?.[0];

  if (!ruleName || !ruleUuid) {
    return null;
  }

  return (
    <EuiLink
      href={http.basePath.prepend(
        `/app/management/insightsAndAlerting/triggersActions/rule/${ruleUuid}`
      )}
    >
      {ruleName}
    </EuiLink>
  );
};

export function getAlertFormatters(fieldFormats: FieldFormatsRegistry) {
  const getFormatter = getFieldFormatterProvider(fieldFormats);

  return (
    columnId: string,
    value: any,
    rowData?: Array<{ field: string; value: any }>
  ): React.ReactElement => {
    switch (columnId) {
      case TIMESTAMP:
      case ALERT_START:
        return <>{getFormatter(FIELD_FORMAT_IDS.DATE)(value)}</>;
      case ALERT_RULE_NAME:
        return rowData ? <AlertRuleLink alertFields={rowData} /> : <>{value}</>;
      case ALERT_DURATION:
        return (
          <>
            {getFormatter(FIELD_FORMAT_IDS.DURATION, {
              inputFormat: 'microseconds',
              outputFormat: 'humanizePrecise',
            })(value) || '--'}
          </>
        );
      case ALERT_RULE_CONSUMER:
        const producer = rowData?.find(({ field }) => field === ALERT_RULE_PRODUCER)?.value?.[0];
        const consumer: AlertConsumers = observabilityFeatureIds.includes(value)
          ? 'observability'
          : producer && (value === 'alerts' || value === 'stackAlerts')
          ? producer
          : value;
        const consumerData = alertProducersData[consumer];
        if (!consumerData) {
          return <>{value}</>;
        }
        return <EuiBadge iconType={consumerData.icon}>{consumerData.displayName}</EuiBadge>;
      default:
        return <>{value}</>;
    }
  };
}

export type RegisterFormatter = ReturnType<typeof getAlertFormatters>;
