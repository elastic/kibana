/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconTip, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  ALERT_DURATION,
  ALERT_SEVERITY_LEVEL,
  ALERT_STATUS,
  ALERT_START,
  RULE_ID,
  RULE_NAME,
} from '@kbn/rule-data-utils/target/technical_field_names';

import type { CellValueElementProps, TimelineNonEcsData } from '../../../../timelines/common';
import { TimestampTooltip } from '../../components/shared/timestamp_tooltip';
import { asDuration, asPercent } from '../../../common/utils/formatters';
import { SeverityBadge } from './severity_badge';
import { parseTechnicalFields } from '../../../../rule_registry/common/parse_technical_fields';
import { usePluginContext } from '../../hooks/use_plugin_context';

const getMappedNonEcsValue = ({
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

/**
 * This implementation of `EuiDataGrid`'s `renderCellValue`
 * accepts `EuiDataGridCellValueElementProps`, plus `data`
 * from the TGrid
 */
export function RenderCellValue({
  columnId,
  data,
  linkValues,
  setFlyoutAlert,
}: CellValueElementProps) {
  const { observabilityRuleTypeRegistry } = usePluginContext();
  const value = getMappedNonEcsValue({
    data,
    fieldName: columnId,
  })?.reduce((x) => x[0]);

  switch (columnId) {
    case ALERT_STATUS:
      return value !== 'closed' ? (
        <EuiIconTip
          content={i18n.translate('xpack.observability.alertsTGrid.statusOpenDescription', {
            defaultMessage: 'Open',
          })}
          color="danger"
          type="alert"
        />
      ) : (
        <EuiIconTip
          content={i18n.translate('xpack.observability.alertsTGrid.statusClosedDescription', {
            defaultMessage: 'Closed',
          })}
          type="check"
        />
      );
    case ALERT_START:
      return <TimestampTooltip time={new Date(value ?? '').getTime()} timeUnit="milliseconds" />;
    case ALERT_DURATION:
      return asDuration(Number(value), { extended: true });
    case ALERT_SEVERITY_LEVEL:
      return <SeverityBadge severityLevel={value ?? undefined} />;
    case RULE_NAME:
      const dataFieldEs = data.reduce((acc, d) => ({ ...acc, [d.field]: d.value }), {});
      const parsedFields = parseTechnicalFields(dataFieldEs);
      const formatter = observabilityRuleTypeRegistry.getFormatter(parsedFields[RULE_ID]!);
      const formatted = {
        reason: parsedFields[RULE_NAME]!,
        ...(formatter?.({ fields: parsedFields, formatters: { asDuration, asPercent } }) ?? {}),
      };

      return (
        <EuiLink onClick={() => setFlyoutAlert && setFlyoutAlert(data)}>{formatted.reason}</EuiLink>
      );
    default:
      return <>{value}</>;
  }
}
