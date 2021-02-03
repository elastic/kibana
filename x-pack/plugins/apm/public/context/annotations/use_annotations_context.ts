/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import { AnnotationsContext } from './annotations_context';

export function useAnnotationsContext() {
  const context = useContext(AnnotationsContext);

  if (!context) {
    throw new Error('Missing Annotations context provider');
  }

  return context;
}
