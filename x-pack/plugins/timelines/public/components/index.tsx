/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { Store } from 'redux';

import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

import { Provider } from 'react-redux';
import { TGrid as TGridComponent } from './t_grid';
import type { TGridProps } from '../types';
import { DragDropContextWrapper } from './drag_and_drop';
import type { TGridIntegratedProps } from './t_grid/integrated';

const EMPTY_BROWSER_FIELDS = {};

type TGridComponent = TGridProps & {
  store?: Store;
  storage: Storage;
  data?: DataPublicPluginStart;
  setStore: (store: Store) => void;
};

export const TGrid = (props: TGridComponent) => {
  const { store, storage, setStore, ...tGridProps } = props;
  let browserFields = EMPTY_BROWSER_FIELDS;
  if ((tGridProps as TGridIntegratedProps).browserFields != null) {
    browserFields = (tGridProps as TGridIntegratedProps).browserFields;
  }
  return (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    <Provider store={store!}>
      <I18nProvider>
        <DragDropContextWrapper browserFields={browserFields} defaultsHeader={props.columns}>
          <TGridComponent {...tGridProps} />
        </DragDropContextWrapper>
      </I18nProvider>
    </Provider>
  );
};

// eslint-disable-next-line import/no-default-export
export { TGrid as default };

export * from './drag_and_drop';
export * from './last_updated';
export * from './loading';
