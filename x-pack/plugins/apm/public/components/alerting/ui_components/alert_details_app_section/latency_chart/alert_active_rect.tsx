/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RectAnnotation } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function AlertActiveRect({ alertStarted }: { alertStarted: number }) {
  return (
    <RectAnnotation
      id="rect_alert_active"
      dataValues={[
        {
          coordinates: {
            y0: 0,
            x0: alertStarted,
          },
          details: i18n.translate(
            'xpack.apm.latency.chart.alertDetails.active',
            {
              defaultMessage: 'Active',
            }
          ),
        },
      ]}
      style={{ fill: 'red', opacity: 0.2 }}
    />
  );
}
