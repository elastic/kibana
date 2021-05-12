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
    const uuid = alert['kibana.rac.alert.uuid']!;
    const start = new Date(alert['kibana.rac.alert.start']!).getTime();
    const end = start + alert['kibana.rac.alert.duration.us']! / 1000;
    const color = getAlertColor({ ruleId: alert['rule.id']!, theme });

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
