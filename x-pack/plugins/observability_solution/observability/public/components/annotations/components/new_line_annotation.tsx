/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnnotationDomainType, LineAnnotation } from '@elastic/charts';
import moment from 'moment';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Annotation, CreateAnnotationParams } from '../../../../common/annotations';

export function NewLineAnnotation({
  sloId,
  sloInstanceId,
  isCreateOpen,
}: {
  sloId?: string;
  sloInstanceId?: string;
  isCreateOpen: boolean;
}) {
  const { watch, getValues } = useFormContext<CreateAnnotationParams>();
  const timestampEnd = watch('@timestampEnd');

  if (timestampEnd) {
    return null;
  }
  const values = getValues();

  return (
    <ObsLineAnnotation
      annotation={{
        ...values,
        ...(sloId ? { slo: { id: sloId, instanceId: sloInstanceId } } : {}),
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
          header: annotation.name,
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
          <EuiIcon type={annotation.annotation?.style?.icon ?? 'iInCircle'} />
        </span>
      }
      markerBody={<EuiText>{annotation.name}</EuiText>}
      markerPosition={annotation.annotation.style?.line?.iconPosition ?? 'top'}
    />
  );
}
