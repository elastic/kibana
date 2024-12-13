/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RectAnnotation } from '@elastic/charts';
import { i18n } from '@kbn/i18n';

interface Props {
  color: string;
  id: string;
  threshold: number;
}

const RECT_ANNOTATION_TITLE = i18n.translate(
  'observabilityAlertDetails.alertThresholdTimeRangeRect.detailsTooltip',
  {
    defaultMessage: 'Threshold',
  }
);

export function AlertThresholdTimeRangeRect({ color, id, threshold }: Props) {
  return (
    <RectAnnotation
      id={id}
      zIndex={2}
      dataValues={[
        {
          coordinates: {
            y0: threshold,
          },
          details: RECT_ANNOTATION_TITLE,
        },
      ]}
      style={{ fill: color, opacity: 0.1 }}
    />
  );
}
