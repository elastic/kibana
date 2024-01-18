/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, type FC, type PropsWithChildren } from 'react';
import useMount from 'react-use/lib/useMount';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import { EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { State } from '@kbn/ml-form-utils/form_slice';
import { createFormSlice } from '@kbn/ml-form-utils/form_slice';

import type { TransformConfigUnion } from '../../../../../common/types/transform';
import { useSearchItems } from '../../../hooks/use_search_items';

import type { FormFields } from './form_field';
import { validators, type ValidatorName } from './validators';
import type { FormSections } from './form_section';
import { getEditTransformFormFields, getEditTransformFormSections } from './get_default_state';

import { WizardContext } from '../../create_transform/components/wizard/wizard';

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
  getEditTransformFormFields(),
  getEditTransformFormSections(),
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

export const EditTransformFlyoutProvider: FC<PropsWithChildren<ProviderProps>> = ({
  children,
  ...props
}) => {
  const {
    error: searchItemsError,
    loadDataViewByEsIndexPattern,
    searchItems,
  } = useSearchItems(undefined);

  const [errorMessage, setErrorMessage] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initializeSearchItems() {
      const { dataViewId, dataViewTitle } = await loadDataViewByEsIndexPattern(
        props.config.source.index
      );

      if (dataViewId === undefined) {
        setErrorMessage(
          i18n.translate('xpack.transformList.preview.noDataViewErrorPromptText', {
            defaultMessage:
              'Unable to preview the transform {transformId}. No data view exists for {dataViewTitle}.',
            values: { dataViewTitle, transformId: props.config.id },
          })
        );
      }
    }

    initializeSearchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchItemsError !== undefined) {
      setErrorMessage(searchItemsError);
      setIsInitialized(true);
    }
  }, [searchItemsError]);

  useEffect(() => {
    if (searchItems !== undefined && searchItemsError === undefined) {
      setIsInitialized(true);
    }
  }, [searchItems, searchItemsError]);

  const reduxStore = useMemo(getReduxStore, []);

  // Apply original transform config to redux form state.
  useMount(() => {
    reduxStore.dispatch(
      editTransformFlyoutSlice.actions.initialize({
        formFieldsArr: getEditTransformFormFields(props.config),
        formSectionsArr: getEditTransformFormSections(props.config),
      })
    );
  });

  if (errorMessage) {
    return (
      <>
        <EuiCallOut
          title={i18n.translate('xpack.transform.clone.errorPromptTitle', {
            defaultMessage: 'An error occurred getting the data view for the transform config.',
          })}
          color="danger"
          iconType="warning"
        >
          <pre>{JSON.stringify(errorMessage)}</pre>
        </EuiCallOut>
      </>
    );
  }

  if (searchItems === undefined || !isInitialized) return null;

  return (
    <WizardContext.Provider value={{ config: props.config, searchItems }}>
      <Provider store={reduxStore}>{children}</Provider>
    </WizardContext.Provider>
  );
};
