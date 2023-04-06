/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RectAnnotation } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function AlertThresholdRect({
  threshold,
  alertStarted,
}: {
  threshold?: number;
  alertStarted: number;
}) {
  if (!threshold) return <></>;

  return (
    <RectAnnotation
      id="rect_alert_threshold"
      zIndex={2}
      dataValues={[
        {
          coordinates: { y0: threshold, x1: alertStarted },
          details: i18n.translate(
            'xpack.apm.latency.chart.alertDetails.threshold',
            {
              defaultMessage: 'Threshold',
            }
          ),
        },
      ]}
      style={{ fill: 'red', opacity: 0.05 }}
    />
  );
}
