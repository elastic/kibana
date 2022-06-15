/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Store } from 'redux';
import { Provider } from 'react-redux';
import { I18nProvider } from '@kbn/i18n-react';
import { FieldBrowser } from '../t_grid/toolbar/field_browser';
import { FieldBrowserProps } from '../../../common/types/field_browser';
export type {
  CreateFieldComponent,
  FieldBrowserOptions,
  FieldBrowserProps,
  GetFieldTableColumns,
} from '../../../common/types/field_browser';

const EMPTY_BROWSER_FIELDS = {};

export type FieldBrowserWrappedComponentProps = FieldBrowserProps & {
  store: Store;
};

export const FieldBrowserWrappedComponent = (props: FieldBrowserWrappedComponentProps) => {
  const { store, ...restProps } = props;
  const fieldBrowserProps = {
    ...restProps,
    browserFields: restProps.browserFields ?? EMPTY_BROWSER_FIELDS,
  };
  return (
    <Provider store={store}>
      <I18nProvider>
        <FieldBrowser {...fieldBrowserProps} />
      </I18nProvider>
    </Provider>
  );
};

FieldBrowserWrappedComponent.displayName = 'FieldBrowserWrappedComponent';

// eslint-disable-next-line import/no-default-export
export { FieldBrowserWrappedComponent as default };
