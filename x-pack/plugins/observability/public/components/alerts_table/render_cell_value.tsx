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
} from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash';
import type { CellValueElementProps, TimelineNonEcsData } from '@kbn/timelines-plugin/common';

import { asDuration } from '../../../common/utils/formatters';
import { AlertSeverityBadge } from '../alert_severity_badge';
import { AlertStatusIndicator } from '../alert_status_indicator';
import { TimestampTooltip } from './timestamp_tooltip';
import { parseAlert } from '../../pages/alerts/helpers/parse_alert';
import type { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';
import type { TopAlert } from '../../typings/alerts';

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
      return JSON.stringify(value);
    }
    return value;
  }

  return '—';
};

/**
 * This implementation of `EuiDataGrid`'s `renderCellValue`
 * accepts `EuiDataGridCellValueElementProps`, plus `data`
 * from the TGrid
 */

export const getRenderCellValue = ({
  setFlyoutAlert,
  observabilityRuleTypeRegistry,
}: {
  setFlyoutAlert: (data: TopAlert) => void;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
}) => {
  return ({ columnId, data }: CellValueElementProps) => {
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
      case ALERT_REASON:
        const dataFieldEs = data.reduce((acc, d) => ({ ...acc, [d.field]: d.value }), {});
        const alert = parseAlert(observabilityRuleTypeRegistry)(dataFieldEs);

        return (
          <EuiLink
            data-test-subj="o11yGetRenderCellValueLink"
            css={{ display: 'contents' }}
            onClick={() => setFlyoutAlert && setFlyoutAlert(alert)}
          >
            {alert.reason}
          </EuiLink>
        );
      default:
        return <>{value}</>;
    }
  };
};
