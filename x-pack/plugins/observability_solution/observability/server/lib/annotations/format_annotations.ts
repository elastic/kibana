/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '../../../common/annotations';

export const formatAnnotation = (annotation: Annotation) => {
  // copy message to title if title is not set
  return {
    ...annotation,
    annotation: {
      ...annotation.annotation,
      title: annotation.annotation.title || annotation.message,
    },
  };
};
