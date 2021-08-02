/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Store } from 'redux';
import { Provider } from 'react-redux';
import { I18nProvider } from '@kbn/i18n/react';
import type { FieldBrowserProps } from '../t_grid/toolbar/fields_browser/types';
import { StatefulFieldsBrowser } from '../t_grid/toolbar/fields_browser';
import {
  FIELD_BROWSER_WIDTH,
  FIELD_BROWSER_HEIGHT,
} from '../t_grid/toolbar/fields_browser/helpers';

const EMPTY_BROWSER_FIELDS = {};
export type FieldBrowserWrappedProps = Omit<FieldBrowserProps, 'width' | 'height'> & {
  width?: FieldBrowserProps['width'];
  height?: FieldBrowserProps['height'];
};
export type FieldBrowserWrappedComponentProps = FieldBrowserWrappedProps & {
  store: Store;
};

export const FieldBrowserWrappedComponent = (props: FieldBrowserWrappedComponentProps) => {
  const { store, ...restProps } = props;
  const fieldsBrowseProps = {
    width: FIELD_BROWSER_WIDTH,
    height: FIELD_BROWSER_HEIGHT,
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
