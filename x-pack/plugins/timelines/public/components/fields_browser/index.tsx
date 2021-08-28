/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import { Provider } from 'react-redux';
import type { Store } from 'redux';
import { StatefulFieldsBrowser } from '../t_grid/toolbar/fields_browser';
import type { FieldBrowserProps } from '../t_grid/toolbar/fields_browser/types';

export type { FieldBrowserProps } from '../t_grid/toolbar/fields_browser/types';
// eslint-disable-next-line import/no-default-export
export { FieldBrowserWrappedComponent as default };

const EMPTY_BROWSER_FIELDS = {};

export type FieldBrowserWrappedComponentProps = FieldBrowserProps & {
  store: Store;
};

export const FieldBrowserWrappedComponent = (props: FieldBrowserWrappedComponentProps) => {
  const { store, ...restProps } = props;
  const fieldsBrowseProps = {
    ...restProps,
    browserFields: restProps.browserFields ?? EMPTY_BROWSER_FIELDS,
  };
  return (
    <Provider store={store}>
      <I18nProvider>
        <StatefulFieldsBrowser {...fieldsBrowseProps} />
      </I18nProvider>
    </Provider>
  );
};

FieldBrowserWrappedComponent.displayName = 'FieldBrowserWrappedComponent';
