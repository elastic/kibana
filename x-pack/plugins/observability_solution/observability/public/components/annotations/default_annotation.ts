/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Moment } from 'moment';
import { defaultAnnotationColor, defaultAnnotationLabel } from '@kbn/event-annotation-common';
import type { CreateAnnotationForm } from './components/create_annotation';

export function getDefaultAnnotation({
  timestamp,
  sloId,
  sloInstanceId,
  timestampEnd,
}: {
  timestamp?: Moment;
  timestampEnd?: Moment;
  sloId?: string;
  sloInstanceId?: string;
}): Partial<CreateAnnotationForm> {
  return {
    name: defaultAnnotationLabel,
    message: '',
    '@timestamp': timestamp ?? moment(),
    '@timestampEnd': timestampEnd,
    annotation: {
      style: {
        icon: 'triangle',
        color: defaultAnnotationColor,
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
        slo: {
          id: sloId,
          instanceId: sloInstanceId,
        },
      }),
  };
}
