/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { AnnotationDomainType, LineAnnotation } from '@elastic/charts';

interface Props {
  id: string;
  threshold: number;
  color: string;
}

const ANNOTATION_TITLE = i18n.translate(
  'observabilityAlertDetails.alertThresholdAnnotation.detailsTooltip',
  {
    defaultMessage: 'Alert started',
  }
);

export function AlertThresholdAnnotation({ threshold, color, id }: Props) {
  return (
    <LineAnnotation
      id={id}
      domainType={AnnotationDomainType.YDomain}
      dataValues={[
        {
          dataValue: threshold,
          header: String(threshold),
          details: ANNOTATION_TITLE,
        },
      ]}
      style={{
        line: {
          opacity: 0.5,
          strokeWidth: 1,
          stroke: color,
        },
      }}
    />
  );
}
