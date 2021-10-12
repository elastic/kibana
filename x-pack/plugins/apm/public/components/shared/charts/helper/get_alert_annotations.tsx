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
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ALERT_DURATION as ALERT_DURATION_TYPED,
  ALERT_SEVERITY as ALERT_SEVERITY_TYPED,
  ALERT_START as ALERT_START_TYPED,
  ALERT_UUID as ALERT_UUID_TYPED,
  ALERT_RULE_TYPE_ID as ALERT_RULE_TYPE_ID_TYPED,
  ALERT_RULE_NAME as ALERT_RULE_NAME_TYPED,
} from '@kbn/rule-data-utils';
import {
  ALERT_DURATION as ALERT_DURATION_NON_TYPED,
  ALERT_SEVERITY as ALERT_SEVERITY_NON_TYPED,
  ALERT_START as ALERT_START_NON_TYPED,
  ALERT_UUID as ALERT_UUID_NON_TYPED,
  ALERT_RULE_TYPE_ID as ALERT_RULE_TYPE_ID_NON_TYPED,
  ALERT_RULE_NAME as ALERT_RULE_NAME_NON_TYPED,
  // @ts-expect-error
} from '@kbn/rule-data-utils/target_node/technical_field_names';
import React, { Dispatch, SetStateAction } from 'react';
import { EuiTheme } from 'src/plugins/kibana_react/common';
import { ValuesType } from 'utility-types';
import type { ObservabilityRuleTypeRegistry } from '../../../../../../observability/public';
import { parseTechnicalFields } from '../../../../../../rule_registry/common';
import { asDuration, asPercent } from '../../../../../common/utils/formatters';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';

const ALERT_DURATION: typeof ALERT_DURATION_TYPED = ALERT_DURATION_NON_TYPED;
const ALERT_SEVERITY: typeof ALERT_SEVERITY_TYPED = ALERT_SEVERITY_NON_TYPED;
const ALERT_START: typeof ALERT_START_TYPED = ALERT_START_NON_TYPED;
const ALERT_UUID: typeof ALERT_UUID_TYPED = ALERT_UUID_NON_TYPED;
const ALERT_RULE_TYPE_ID: typeof ALERT_RULE_TYPE_ID_TYPED =
  ALERT_RULE_TYPE_ID_NON_TYPED;
const ALERT_RULE_NAME: typeof ALERT_RULE_NAME_TYPED = ALERT_RULE_NAME_NON_TYPED;

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

/**
 * Get the components needed to render alert annotations.
 *
 * You might be thinking, "Hey, this is a function that returns DOM.
 * This should not be a function but a component."
 *
 * You would be correct, except for https://github.com/elastic/elastic-charts/issues/914,
 * which makes it so if you construct a chart with its elements broken into
 * different components it makes the whole chart disappear, which is not what
 * we want.
 */
export function getAlertAnnotations({
  alerts,
  chartStartTime,
  getFormatter,
  selectedAlertId,
  setSelectedAlertId,
  theme,
}: {
  alerts?: Alert[];
  chartStartTime: number;
  getFormatter: ObservabilityRuleTypeRegistry['getFormatter'];
  selectedAlertId?: string;
  setSelectedAlertId: Dispatch<SetStateAction<string | undefined>>;
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
    const severityLevel = parsed[ALERT_SEVERITY];
    const color = getAlertColor({ severityLevel, theme });
    const header = getAlertHeader({ severityLevel });
    const formatter = getFormatter(parsed[ALERT_RULE_TYPE_ID]!);
    const formatted = {
      link: undefined,
      reason: parsed[ALERT_RULE_NAME],
      ...(formatter?.({
        fields: parsed,
        formatters: { asDuration, asPercent },
      }) ?? {}),
    };
    const isSelected = uuid === selectedAlertId;

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
        marker={
          <EuiButtonIcon
            aria-label={i18n.translate(
              'xpack.apm.alertAnnotationButtonAriaLabel',
              { defaultMessage: 'View alert details' }
            )}
            color={severityLevel === 'warning' ? 'warning' : 'danger'}
            onClick={() => {
              if (selectedAlertId === uuid) {
                setSelectedAlertId(undefined);
              } else {
                setSelectedAlertId(uuid);
              }
            }}
            iconSize={isSelected ? 'l' : 'm'}
            iconType="alert"
            size="xs"
          />
        }
        markerPosition={Position.Top}
        style={{
          line: { opacity: 1, strokeWidth: isSelected ? 6 : 2, stroke: color },
        }}
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
        style={{ fill: color, opacity: isSelected ? 0.6 : 0.25 }}
      />,
    ];
  });
}
