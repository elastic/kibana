/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Moment } from 'moment';
import {
  defaultAnnotationColor,
  defaultAnnotationLabel,
  defaultRangeAnnotationLabel,
  defaultAnnotationRangeColor,
} from '@kbn/event-annotation-common';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { CreateAnnotationForm } from './components/create_annotation';

export function getDefaultAnnotation({
  slo,
  timestamp,
  timestampEnd,
}: {
  timestamp?: Moment;
  timestampEnd?: Moment;
  slo?: SLOWithSummaryResponse;
}): Partial<CreateAnnotationForm> {
  const sloId = slo?.id;
  const sloInstanceId = slo?.instanceId;

  return {
    message: timestampEnd ? defaultRangeAnnotationLabel : defaultAnnotationLabel,
    '@timestamp': timestamp ?? moment(),
    '@timestampEnd': timestampEnd,
    annotation: {
      style: {
        icon: 'triangle',
        color: timestampEnd ? defaultAnnotationRangeColor : defaultAnnotationColor,
        line: {
          width: 2,
          style: 'solid',
          textDecoration: 'name',
        },
        rect: {
          fill: 'inside',
        },
      },
    },
    ...(sloId &&
      sloInstanceId && {
        slos: [
          {
            id: sloId,
            instanceId: sloInstanceId,
          },
        ],
      }),
  };
}
