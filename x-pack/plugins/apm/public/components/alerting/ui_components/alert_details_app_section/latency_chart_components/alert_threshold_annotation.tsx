/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AnnotationDomainType, LineAnnotation } from '@elastic/charts';

export function AlertThresholdAnnotation({
  threshold,
}: {
  threshold?: number;
}) {
  if (!threshold) return <></>;

  return (
    <LineAnnotation
      id="annotation_alert_threshold"
      domainType={AnnotationDomainType.YDomain}
      dataValues={[
        {
          dataValue: threshold,
          header: String(threshold),
        },
      ]}
      style={{
        line: {
          opacity: 0.5,
          strokeWidth: 1,
          stroke: 'red',
        },
      }}
    />
  );
}
