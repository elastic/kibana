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
import { StatefulFieldsBrowser } from '../t_grid/toolbar/fields_browser';
import { FieldBrowserProps } from '../../../common/types/fields_browser';
export type {
  CreateFieldComponent,
  FieldBrowserOptions,
  FieldBrowserProps,
  GetFieldTableColumns,
} from '../../../common/types/fields_browser';

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

// eslint-disable-next-line import/no-default-export
export { FieldBrowserWrappedComponent as default };
