/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingSpinner } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import React, { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import type { AddToTimelineButtonProps } from './actions/add_to_timeline';
import type { ColumnToggleProps } from './actions/column_toggle';
import type { CopyProps } from './actions/copy';
import type { HoverActionComponentProps, FilterValueFnArgs } from './actions/types';
import type { OverflowButtonProps } from './actions/overflow';

export interface HoverActionsConfig {
  getAddToTimelineButton: (
    props: AddToTimelineButtonProps
  ) => ReactElement<AddToTimelineButtonProps>;
  getColumnToggleButton: (props: ColumnToggleProps) => ReactElement<ColumnToggleProps>;
  getCopyButton: (props: CopyProps) => ReactElement<CopyProps>;
  getFilterForValueButton: (
    props: HoverActionComponentProps & FilterValueFnArgs
  ) => ReactElement<HoverActionComponentProps & FilterValueFnArgs>;
  getFilterOutValueButton: (
    props: HoverActionComponentProps & FilterValueFnArgs
  ) => ReactElement<HoverActionComponentProps & FilterValueFnArgs>;
  getOverflowButton: (props: OverflowButtonProps) => ReactElement<HoverActionComponentProps>;
}

const AddToTimelineButtonLazy = React.lazy(() => import('./actions/add_to_timeline'));
const getAddToTimelineButtonLazy = (store: Store, props: AddToTimelineButtonProps) => {
  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <Provider store={store}>
        <I18nProvider>
          <AddToTimelineButtonLazy {...props} />
        </I18nProvider>
      </Provider>
    </React.Suspense>
  );
};

const ColumnToggleButtonLazy = React.lazy(() => import('./actions/column_toggle'));
const getColumnToggleButtonLazy = (props: ColumnToggleProps) => {
  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <ColumnToggleButtonLazy {...props} />
    </React.Suspense>
  );
};

const CopyButtonLazy = React.lazy(() => import('./actions/copy'));
const getCopyButtonLazy = (props: CopyProps) => {
  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <CopyButtonLazy {...props} />
    </React.Suspense>
  );
};

const FilterForValueButtonLazy = React.lazy(() => import('./actions/filter_for_value'));
const getFilterForValueButtonLazy = (props: HoverActionComponentProps & FilterValueFnArgs) => {
  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <FilterForValueButtonLazy {...props} />
    </React.Suspense>
  );
};

const FilterOutValueButtonLazy = React.lazy(() => import('./actions/filter_out_value'));
const getFilterOutValueButtonLazy = (props: HoverActionComponentProps & FilterValueFnArgs) => {
  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <FilterOutValueButtonLazy {...props} />
    </React.Suspense>
  );
};

const OverflowButtonLazy = React.lazy(() => import('./actions/overflow'));
const getOverflowButtonLazy = (props: OverflowButtonProps) => {
  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <OverflowButtonLazy {...props} />
    </React.Suspense>
  );
};

export const getHoverActions = (store?: Store): HoverActionsConfig => ({
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  getAddToTimelineButton: getAddToTimelineButtonLazy.bind(null, store!),
  getColumnToggleButton: getColumnToggleButtonLazy,
  getCopyButton: getCopyButtonLazy,
  getFilterForValueButton: getFilterForValueButtonLazy,
  getFilterOutValueButton: getFilterOutValueButtonLazy,
  getOverflowButton: getOverflowButtonLazy,
});
