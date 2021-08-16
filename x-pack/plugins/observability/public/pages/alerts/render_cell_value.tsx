/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiIconTip, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
/**
 * We need to produce types and code transpilation at different folders during the build of the package.
 * We have types and code at different imports because we don't want to import the whole package in the resulting webpack bundle for the plugin.
 * This way plugins can do targeted imports to reduce the final code bundle
 */
import type {
  ALERT_DURATION as ALERT_DURATION_TYPED,
  ALERT_SEVERITY_LEVEL as ALERT_SEVERITY_LEVEL_TYPED,
  ALERT_STATUS as ALERT_STATUS_TYPED,
  ALERT_RULE_NAME as ALERT_RULE_NAME_TYPED,
} from '@kbn/rule-data-utils';
import {
  ALERT_DURATION as ALERT_DURATION_NON_TYPED,
  ALERT_SEVERITY_LEVEL as ALERT_SEVERITY_LEVEL_NON_TYPED,
  ALERT_STATUS as ALERT_STATUS_NON_TYPED,
  ALERT_RULE_NAME as ALERT_RULE_NAME_NON_TYPED,
  TIMESTAMP,
  // @ts-expect-error importing from a place other than root because we want to limit what we import from this package
} from '@kbn/rule-data-utils/target_node/technical_field_names';

import type { CellValueElementProps, TimelineNonEcsData } from '../../../../timelines/common';
import { TimestampTooltip } from '../../components/shared/timestamp_tooltip';
import { asDuration } from '../../../common/utils/formatters';
import { SeverityBadge } from './severity_badge';
import { TopAlert } from '.';
import { parseAlert } from './parse_alert';
import { usePluginContext } from '../../hooks/use_plugin_context';

const ALERT_DURATION: typeof ALERT_DURATION_TYPED = ALERT_DURATION_NON_TYPED;
const ALERT_SEVERITY_LEVEL: typeof ALERT_SEVERITY_LEVEL_TYPED = ALERT_SEVERITY_LEVEL_NON_TYPED;
const ALERT_STATUS: typeof ALERT_STATUS_TYPED = ALERT_STATUS_NON_TYPED;
const ALERT_RULE_NAME: typeof ALERT_RULE_NAME_TYPED = ALERT_RULE_NAME_NON_TYPED;

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

/**
 * This implementation of `EuiDataGrid`'s `renderCellValue`
 * accepts `EuiDataGridCellValueElementProps`, plus `data`
 * from the TGrid
 */

export const getRenderCellValue = ({
  rangeTo,
  rangeFrom,
  setFlyoutAlert,
}: {
  rangeTo: string;
  rangeFrom: string;
  setFlyoutAlert: (data: TopAlert) => void;
}) => {
  return ({ columnId, data, setCellProps }: CellValueElementProps) => {
    const { observabilityRuleTypeRegistry } = usePluginContext();
    const value = getMappedNonEcsValue({
      data,
      fieldName: columnId,
    })?.reduce((x) => x[0]);

    useEffect(() => {
      if (columnId === ALERT_STATUS) {
        setCellProps({
          style: {
            textAlign: 'center',
          },
        });
      }
    }, [columnId, setCellProps]);

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
      case TIMESTAMP:
        return <TimestampTooltip time={new Date(value ?? '').getTime()} timeUnit="milliseconds" />;
      case ALERT_DURATION:
        return asDuration(Number(value));
      case ALERT_SEVERITY_LEVEL:
        return <SeverityBadge severityLevel={value ?? undefined} />;
      case ALERT_RULE_NAME:
        const dataFieldEs = data.reduce((acc, d) => ({ ...acc, [d.field]: d.value }), {});
        const alert = parseAlert(observabilityRuleTypeRegistry)(dataFieldEs);

        return (
          // NOTE: EuiLink automatically renders links using a <button>
          // instead of an <a> when an `onClick` prop is provided, but this
          // breaks text-truncation in `EuiDataGrid`, because (per the HTML
          // spec), buttons are *always* rendered as `inline-block`, even if
          // `display` is overridden. Passing an empty `href` prop forces
          // `EuiLink` to render the link as an (inline) <a>, which enables
          // text truncation, but requires overriding the linter warning below:
          // eslint-disable-next-line @elastic/eui/href-or-on-click
          <EuiLink href="" onClick={() => setFlyoutAlert && setFlyoutAlert(alert)}>
            {alert.reason}
          </EuiLink>
        );
      default:
        return <>{value}</>;
    }
  };
};
