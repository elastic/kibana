/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLink } from '@elastic/eui';
import React from 'react';
import {
  ALERT_DURATION,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_REASON,
  TIMESTAMP,
  ALERT_UUID,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_VALUES,
  ALERT_RULE_NAME,
  ALERT_RULE_CATEGORY,
} from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash';
import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import type { ObservabilityRuleTypeRegistry } from '../../..';
import { asDuration } from '../../../../common/utils/formatters';
import { AlertSeverityBadge } from '../../alert_severity_badge';
import { AlertStatusIndicator } from '../../alert_status_indicator';
import { parseAlert } from '../../../pages/alerts/helpers/parse_alert';
import { CellTooltip } from './cell_tooltip';
import { TimestampTooltip } from './timestamp_tooltip';

export const getMappedNonEcsValue = ({
  data,
  fieldName,
}: {
  data: TimelineNonEcsData[];
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
      try {
        return JSON.stringify(value);
      } catch (e) {
        return 'Error: Unable to parse JSON value.';
      }
    }
    return value;
  }

  return '--';
};

/**
 * This implementation of `EuiDataGrid`'s `renderCellValue`
 * accepts `EuiDataGridCellValueElementProps`, plus `data`
 * from the TGrid
 */

export const getRenderCellValue = ({
  columnId,
  data,
  setFlyoutAlert,
  observabilityRuleTypeRegistry,
}: {
  columnId: string;
  data?: Array<{ field: string; value: any }>;
  setFlyoutAlert?: (alertId: string) => void;
  observabilityRuleTypeRegistry?: ObservabilityRuleTypeRegistry;
}) => {
  if (!data) return null;
  const mappedNonEcsValue = getMappedNonEcsValue({
    data,
    fieldName: columnId,
  });
  const value = getRenderValue(mappedNonEcsValue);

  switch (columnId) {
    case ALERT_STATUS:
      if (value !== ALERT_STATUS_ACTIVE && value !== ALERT_STATUS_RECOVERED) {
        // NOTE: This should only be needed to narrow down the type.
        // Status should be either "active" or "recovered".
        return null;
      }
      return <AlertStatusIndicator alertStatus={value} />;
    case TIMESTAMP:
      return <TimestampTooltip time={new Date(value ?? '').getTime()} timeUnit="milliseconds" />;
    case ALERT_DURATION:
      return asDuration(Number(value));
    case ALERT_SEVERITY:
      return <AlertSeverityBadge severityLevel={value ?? undefined} />;
    case ALERT_EVALUATION_VALUE:
      const valuesField = getMappedNonEcsValue({
        data,
        fieldName: ALERT_EVALUATION_VALUES,
      });
      const values = getRenderValue(valuesField);
      return valuesField ? values : value;
    case ALERT_REASON:
      const dataFieldEs = data.reduce((acc, d) => ({ ...acc, [d.field]: d.value }), {});
      if (!observabilityRuleTypeRegistry) return <>{value}</>;
      const alert = parseAlert(observabilityRuleTypeRegistry)(dataFieldEs);

      return (
        <EuiLink
          data-test-subj="o11yGetRenderCellValueLink"
          css={{ display: 'contents' }}
          onClick={() => setFlyoutAlert && setFlyoutAlert(alert.fields[ALERT_UUID])}
        >
          {alert.reason}
        </EuiLink>
      );
    case ALERT_RULE_NAME:
      const ruleCategory = getMappedNonEcsValue({
        data,
        fieldName: ALERT_RULE_CATEGORY,
      });
      const tooltipContent = getRenderValue(ruleCategory);
      return <CellTooltip value={value} tooltipContent={tooltipContent} />;
    default:
      return <>{value}</>;
  }
};
