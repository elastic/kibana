/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ObsRectAnnotation } from './new_rect_annotation';
import { ObsLineAnnotation } from './new_line_annotation';
import { Annotation } from '../../../../common/annotations';

export function ObsAnnotation({ annotation }: { annotation: Annotation }) {
  if (!annotation.event?.end || annotation.annotation.type === 'line') {
    return <ObsLineAnnotation annotation={annotation} />;
  }
  return <ObsRectAnnotation annotation={annotation} />;
}
