/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RectAnnotation } from '@elastic/charts';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import moment from 'moment';
import { useFormContext } from 'react-hook-form';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { AnnotationTooltip } from './annotation_tooltip';
import { Annotation, CreateAnnotationParams } from '../../../../common/annotations';

export function NewRectAnnotation({
  slo,
  isCreateOpen,
}: {
  isCreateOpen: boolean;
  slo?: SLOWithSummaryResponse;
}) {
  const { watch, getValues } = useFormContext<CreateAnnotationParams>();
  const timestamp = watch('@timestamp');
  const eventEnd = watch('event.end');

  if (!timestamp || !eventEnd || !isCreateOpen) {
    return null;
  }
  const values = getValues();

  const annotationStyle = watch('annotation.style');
  const annotationType = watch('annotation.type');

  return (
    <ObsRectAnnotation
      annotation={{
        ...values,
        annotation: {
          ...values.annotation,
          style: annotationStyle,
          type: annotationType,
        },
        ...(slo ? { slo: { id: slo.id, instanceId: slo.instanceId } } : {}),
      }}
    />
  );
}

export function ObsRectAnnotation({
  annotation,
}: {
  annotation: Annotation | CreateAnnotationParams;
}) {
  const message = annotation.message;
  const timestamp = annotation['@timestamp'];
  const timestampEnd = annotation.event?.end;
  const { euiTheme } = useEuiTheme();
  const annotationStyle = annotation.annotation?.style;

  const color = annotationStyle?.color ?? euiTheme.colors.warning;

  return (
    <RectAnnotation
      dataValues={[
        {
          coordinates: {
            x0: moment(timestamp).valueOf(),
            x1: moment(timestampEnd).valueOf(),
          },
          details: message,
        },
      ]}
      id={'id' in annotation ? annotation.id : `${timestamp}${message}`}
      style={{ fill: color, opacity: 1 }}
      outside={annotationStyle?.rect?.fill === 'outside'}
      outsideDimension={14}
      customTooltip={() => <AnnotationTooltip annotation={annotation} />}
    />
  );
}
