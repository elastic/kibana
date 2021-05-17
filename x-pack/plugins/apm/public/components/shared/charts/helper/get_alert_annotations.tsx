/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ValuesType } from 'utility-types';
import { RectAnnotation } from '@elastic/charts';
import { EuiTheme } from 'src/plugins/kibana_react/common';
import { rgba } from 'polished';
import {
  ALERT_DURATION,
  RULE_ID,
  ALERT_START,
  ALERT_UUID,
} from '@kbn/rule-data-utils/target/technical_field_names';
import { parseTechnicalFields } from '../../../../../../rule_registry/common';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';

type Alert = ValuesType<
  APIReturnType<'GET /api/apm/services/{serviceName}/alerts'>['alerts']
>;

function getAlertColor({ theme, ruleId }: { ruleId: string; theme: EuiTheme }) {
  switch (ruleId) {
    default:
      return theme.eui.euiColorVis2;
  }
}

export function getAlertAnnotations({
  alerts,
  theme,
}: {
  alerts?: Alert[];
  theme: EuiTheme;
}) {
  return alerts?.flatMap((alert) => {
    const parsed = parseTechnicalFields(alert);
    const uuid = parsed[ALERT_UUID]!;
    const start = new Date(parsed[ALERT_START]!).getTime();
    const end = start + parsed[ALERT_DURATION]! / 1000;
    const color = getAlertColor({ ruleId: parsed[RULE_ID]!, theme });

    return [
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
      <RectAnnotation
        key={`alert_${uuid}_border`}
        id={`alert_${uuid}_border`}
        dataValues={[
          {
            coordinates: {
              x0: start,
              x1: end,
              y0: 0,
              y1: 0,
            },
          },
        ]}
        style={{
          fill: rgba(0, 0, 0, 0),
          strokeWidth: 2,
          stroke: color,
          opacity: 1,
        }}
      />,
    ];
  });
}
