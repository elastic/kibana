/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { CoreVitalProps, HeaderMenuPortalProps } from './types';
import type { FieldValueSuggestionsProps } from './field_value_suggestions/types';
import type { FilterValueLabelProps } from './filter_value_label/filter_value_label';

export { createLazyObservabilityPageTemplate } from './page_template';
export type { LazyObservabilityPageTemplateProps } from './page_template';

const CoreVitalsLazy = lazy(() => import('./core_web_vitals/index'));

export function getCoreVitalsComponent(props: CoreVitalProps) {
  return (
    <Suspense fallback={null}>
      <CoreVitalsLazy {...props} />
    </Suspense>
  );
}

const HeaderMenuPortalLazy = lazy(() => import('./header_menu_portal'));

export function HeaderMenuPortal(props: HeaderMenuPortalProps) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <HeaderMenuPortalLazy {...props} />
    </Suspense>
  );
}

const FieldValueSuggestionsLazy = lazy(() => import('./field_value_suggestions/index'));

export function FieldValueSuggestions(props: FieldValueSuggestionsProps) {
  return (
    <Suspense fallback={null}>
      <FieldValueSuggestionsLazy {...props} />
    </Suspense>
  );
}

const FilterValueLabelLazy = lazy(() => import('./filter_value_label/filter_value_label'));

export function FilterValueLabel(props: FilterValueLabelProps) {
  return (
    <Suspense fallback={null}>
      <FilterValueLabelLazy {...props} />
    </Suspense>
  );
}
