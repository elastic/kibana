/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AnnotationDomainType,
  LineAnnotation,
  Position,
  RectAnnotation,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ALERT_DURATION,
  ALERT_SEVERITY_LEVEL,
  ALERT_START,
  ALERT_UUID,
  RULE_ID,
  RULE_NAME,
} from '@kbn/rule-data-utils/target/technical_field_names';
import React from 'react';
import { EuiTheme } from 'src/plugins/kibana_react/common';
import { ValuesType } from 'utility-types';
import type { ObservabilityRuleTypeRegistry } from '../../../../../../observability/public';
import { parseTechnicalFields } from '../../../../../../rule_registry/common';
import { asDuration, asPercent } from '../../../../../common/utils/formatters';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';

type Alert = ValuesType<
  APIReturnType<'GET /api/apm/services/{serviceName}/alerts'>['alerts']
>;

function getAlertColor({
  severityLevel,
  theme,
}: {
  severityLevel: string | undefined;
  theme: EuiTheme;
}) {
  switch (severityLevel) {
    case 'warning':
      return theme.eui.euiColorWarning;
    default:
      return theme.eui.euiColorDanger;
  }
}

function getAlertHeader({
  severityLevel,
}: {
  severityLevel: string | undefined;
}) {
  switch (severityLevel) {
    case 'critical':
      return i18n.translate('xpack.apm.alertAnnotationCriticalTitle', {
        defaultMessage: 'Critical Alert',
      });
    case 'warning':
      return i18n.translate('xpack.apm.alertAnnotationWarningTitle', {
        defaultMessage: 'Warning Alert',
      });
    default:
      return i18n.translate('xpack.apm.alertAnnotationNoSeverityTitle', {
        defaultMessage: 'Alert',
      });
  }
}

export function getAlertAnnotations({
  alerts,
  chartStartTime,
  getFormatter,
  theme,
}: {
  alerts?: Alert[];
  chartStartTime: number;
  getFormatter: ObservabilityRuleTypeRegistry['getFormatter'];
  theme: EuiTheme;
}) {
  return alerts?.flatMap((alert) => {
    const parsed = parseTechnicalFields(alert);
    const uuid = parsed[ALERT_UUID]!;
    // Don't start the annotation before the beginning of the chart time range
    const start = Math.max(
      chartStartTime,
      new Date(parsed[ALERT_START]!).getTime()
    );
    const end = start + parsed[ALERT_DURATION]! / 1000;
    const severityLevel = parsed[ALERT_SEVERITY_LEVEL];
    const color = getAlertColor({ severityLevel, theme });
    const header = getAlertHeader({ severityLevel });
    const formatter = getFormatter(parsed[RULE_ID]!);
    const formatted = {
      link: undefined,
      reason: parsed[RULE_NAME],
      ...(formatter?.({
        fields: parsed,
        formatters: { asDuration, asPercent },
      }) ?? {}),
    };

    return [
      <LineAnnotation
        dataValues={[
          {
            dataValue: start,
            details: formatted.reason,
            header,
          },
        ]}
        domainType={AnnotationDomainType.XDomain}
        id={`alert_${uuid}_line`}
        key={`alert_${uuid}_line`}
        marker={<EuiIcon type="alert" />}
        markerPosition={Position.Top}
        style={{ line: { opacity: 1, strokeWidth: 2, stroke: color } }}
      />,
      <RectAnnotation
        key={`alert_${uuid}_area`}
        id={`alert_${uuid}_area`}
        dataValues={[
          {
            coordinates: {
              x0: start,
              x1: end,
            },
          },
        ]}
        style={{ fill: color }}
      />,
    ];
  });
}
