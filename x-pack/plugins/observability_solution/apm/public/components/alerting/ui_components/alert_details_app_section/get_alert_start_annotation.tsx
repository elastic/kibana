/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { AlertActiveTimeRangeAnnotation, AlertAnnotation } from '@kbn/observability-alert-details';

export function getAlertStartAnnotation({
  alertStart,
  alertEnd,
  dateFormat,
  color,
}: {
  alertStart: number;
  alertEnd?: number;
  dateFormat: string;
  color: string;
}) {
  return [
    <AlertActiveTimeRangeAnnotation
      alertStart={alertStart}
      alertEnd={alertEnd}
      color={color}
      id="alertActiveRect"
      key="alertActiveRect"
    />,
    <AlertAnnotation
      key="alertAnnotationStart"
      id="alertAnnotationStart"
      alertStart={alertStart}
      color={color}
      dateFormat={dateFormat}
    />,
  ];
}
