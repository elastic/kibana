/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type {
  FieldValueSuggestionsProps,
  FieldValueSelectionProps,
} from './field_value_suggestions/types';

const FieldValueSelectionLazy = lazy(
  () => import('./field_value_suggestions/field_value_selection')
);

export function FieldValueSelection(props: FieldValueSelectionProps) {
  return (
    <Suspense fallback={null}>
      <FieldValueSelectionLazy {...props} />
    </Suspense>
  );
}

const FieldValueSuggestionsLazy = lazy(() => import('./field_value_suggestions'));

export function FieldValueSuggestions(props: FieldValueSuggestionsProps) {
  return (
    <Suspense fallback={null}>
      <FieldValueSuggestionsLazy {...props} />
    </Suspense>
  );
}
