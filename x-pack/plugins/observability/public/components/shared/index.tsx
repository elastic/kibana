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
import type { DatePickerProps } from './date_picker';
import type { FilterValueLabelProps } from './filter_value_label/filter_value_label';
import type { SelectableUrlListProps } from './exploratory_view/components/url_search/selectable_url_list';
import type { ExploratoryViewPageProps } from './exploratory_view';
export { createLazyObservabilityPageTemplate } from './page_template';
export type { LazyObservabilityPageTemplateProps } from './page_template';

const CoreVitalsLazy = lazy(() => import('./core_web_vitals'));

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

const FieldValueSuggestionsLazy = lazy(() => import('./field_value_suggestions'));

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

const SelectableUrlListLazy = lazy(
  () => import('./exploratory_view/components/url_search/selectable_url_list')
);

export function SelectableUrlList(props: SelectableUrlListProps) {
  return (
    <Suspense fallback={null}>
      <SelectableUrlListLazy {...props} />
    </Suspense>
  );
}

const ExploratoryViewLazy = lazy(() => import('./exploratory_view'));

export function ExploratoryView(props: ExploratoryViewPageProps) {
  return (
    <Suspense fallback={null}>
      <ExploratoryViewLazy {...props} />
    </Suspense>
  );
}

const DatePickerLazy = lazy(() => import('./date_picker'));

export function DatePicker(props: DatePickerProps) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <DatePickerLazy {...props} />
    </Suspense>
  );
}
