/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, type FC, type PropsWithChildren } from 'react';
import useMount from 'react-use/lib/useMount';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import type { State } from '@kbn/ml-form-utils/form_slice';
import { createFormSlice } from '@kbn/ml-form-utils/form_slice';

import type { TransformConfigUnion } from '../../../../../common/types/transform';

import type { FormFields } from './form_field';
import { validators, type ValidatorName } from './validators';
import type { FormSections } from './form_section';
import { getDefaultState } from './get_default_state';

// The edit transform flyout uses a redux-toolkit to manage its form state with
// support for applying its state to a nested configuration object suitable for passing on
// directly to the API call. For now this is only used for the transform edit form.
// Once we apply the functionality to other places, e.g. the transform creation wizard,
// the generic framework code in this file should be moved to a dedicated location.

export interface ProviderProps {
  config: TransformConfigUnion;
  dataViewId?: string;
}

export type EditTransformFlyoutState = State<FormFields, FormSections, ValidatorName>;
export const editTransformFlyoutSlice = createFormSlice(
  'editTransformFlyout',
  getDefaultState,
  validators
);

const getReduxStore = () =>
  configureStore({
    reducer: {
      [editTransformFlyoutSlice.name]: editTransformFlyoutSlice.reducer,
    },
  });

// Because we get the redux store with a factory function we need to
// use these nested ReturnTypes to dynamically get the StoreState.
export type StoreState = ReturnType<ReturnType<typeof getReduxStore>['getState']>;

const EditTransformFlyoutContext = createContext<ProviderProps | null>(null);

export const EditTransformFlyoutProvider: FC<PropsWithChildren<ProviderProps>> = ({
  children,
  ...props
}) => {
  const store = useMemo(getReduxStore, []);

  // Apply original transform config to redux form state.
  useMount(() => {
    store.dispatch(editTransformFlyoutSlice.actions.initialize(getDefaultState(props.config)));
  });

  return (
    <EditTransformFlyoutContext.Provider value={props}>
      <Provider store={store}>{children}</Provider>
    </EditTransformFlyoutContext.Provider>
  );
};

export const useEditTransformFlyoutContext = () => {
  const c = useContext(EditTransformFlyoutContext);
  if (c === null) throw new Error('EditTransformFlyoutContext not set.');
  return c;
};
