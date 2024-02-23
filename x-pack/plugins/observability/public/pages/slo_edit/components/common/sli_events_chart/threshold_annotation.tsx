/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnnotationDomainType, LineAnnotation, RectAnnotation } from '@elastic/charts';
import React from 'react';

export function ThresholdAnnotation({
  threshold,
  thresholdDirection,
  thresholdColor,
  thresholdMessage,
  minValue,
  maxValue,
}: {
  threshold?: number;
  thresholdDirection?: 'above' | 'below';
  thresholdColor?: string;
  thresholdMessage?: string;
  minValue?: number | null;
  maxValue?: number | null;
}) {
  return threshold != null ? (
    <>
      <LineAnnotation
        id="thresholdAnnotation"
        domainType={AnnotationDomainType.YDomain}
        dataValues={[{ dataValue: threshold }]}
        style={{
          line: {
            strokeWidth: 2,
            stroke: thresholdColor || '#000',
            opacity: 1,
          },
        }}
      />
      <RectAnnotation
        dataValues={[
          {
            coordinates:
              thresholdDirection === 'above'
                ? {
                    y0: threshold,
                    y1: maxValue,
                  }
                : { y0: minValue, y1: threshold },
            details: thresholdMessage,
          },
        ]}
        id="thresholdShade"
        style={{ fill: thresholdColor || '#000', opacity: 0.1 }}
      />
    </>
  ) : null;
}
