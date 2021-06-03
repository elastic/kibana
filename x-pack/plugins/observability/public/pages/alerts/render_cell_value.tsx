/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconTip, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { RULE_ID, RULE_NAME } from '@kbn/rule-data-utils/target/technical_field_names';

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
    case 'kibana.rac.alert.status':
      return value !== 'closed' ? (
        <EuiIconTip
          content={i18n.translate('xpack.observability.alertsTable.statusOpenDescription', {
            defaultMessage: 'Open',
          })}
          color="danger"
          type="alert"
        />
      ) : (
        <EuiIconTip
          content={i18n.translate('xpack.observability.alertsTable.statusClosedDescription', {
            defaultMessage: 'Closed',
          })}
          type="check"
        />
      );
    case 'kibana.rac.alert.start':
      return <TimestampTooltip time={new Date(value ?? '').getTime()} timeUnit="milliseconds" />;
    case 'kibana.rac.alert.duration.us':
      return asDuration(Number(value), { extended: true });
    case 'kibana.rac.alert.severity.level':
      return <SeverityBadge severityLevel={value} />;
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
