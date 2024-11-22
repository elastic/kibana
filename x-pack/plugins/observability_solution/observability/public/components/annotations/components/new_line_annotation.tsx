/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { AnnotationDomainType, LineAnnotation } from '@elastic/charts';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { AnnotationIcon } from './annotation_icon';
import { AnnotationTooltip } from './annotation_tooltip';
import { Annotation, CreateAnnotationParams } from '../../../../common/annotations';

export function NewLineAnnotation({
  slo,
  isCreateOpen,
}: {
  slo?: SLOWithSummaryResponse;
  isCreateOpen: boolean;
}) {
  const { watch, getValues } = useFormContext<CreateAnnotationParams>();
  const eventEnd = watch('event.end');

  if (eventEnd || !isCreateOpen) {
    return null;
  }
  const values = getValues();
  const annotationStyle = watch('annotation.style');
  const annotationType = watch('annotation.type');

  return (
    <ObsLineAnnotation
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

export function ObsLineAnnotation({
  annotation,
}: {
  annotation: CreateAnnotationParams | Annotation;
}) {
  const timestamp = annotation['@timestamp'];
  const message = annotation.message;
  const { euiTheme } = useEuiTheme();

  const line = annotation.annotation.style?.line;

  return (
    <LineAnnotation
      id={'id' in annotation ? annotation.id : `${timestamp}${message}`}
      domainType={AnnotationDomainType.XDomain}
      dataValues={[
        {
          dataValue: moment(timestamp).valueOf(),
          details: message,
          header: annotation.message,
        },
      ]}
      style={{
        line: {
          strokeWidth: line?.width ?? 2,
          stroke: annotation?.annotation.style?.color ?? euiTheme.colors.warning,
          opacity: 1,
          ...(line?.style === 'dashed' && {
            dash: [(line?.width ?? 2) * 3, line?.width ?? 2],
          }),
          ...(line?.style === 'dotted' && {
            dash: [line?.width ?? 2, line?.width ?? 2],
          }),
        },
      }}
      marker={
        <span>
          <AnnotationIcon annotation={annotation} />
        </span>
      }
      markerBody={<EuiText>{annotation.annotation?.title ?? annotation.message}</EuiText>}
      markerPosition={annotation.annotation.style?.line?.iconPosition ?? 'top'}
      customTooltip={() => <AnnotationTooltip annotation={annotation} />}
    />
  );
}
