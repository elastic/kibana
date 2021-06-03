/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { I18nProvider } from '@kbn/i18n/react';
import { Store } from 'redux';

import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { createStore } from '../store/t_grid';

import { TGrid as TGridComponent } from './tgrid';
import { TGridProps } from '../types';
import { DragDropContextWrapper } from './drag_and_drop';
import { initialTGridState } from '../store/t_grid/reducer';
import { TGridIntegratedProps } from './t_grid/integrated';

const EMPTY_BROWSER_FIELDS = {};

type TGridComponent = TGridProps & {
  store?: Store;
  storage: Storage;
};

export const TGrid = (props: TGridComponent) => {
  console.log('TGrid');
  const { store, storage, ...tGridProps } = props;
  let tGridStore = store;
  if (!tGridStore && props.type === 'standalone') {
    tGridStore = createStore(initialTGridState, storage);
  }
  let browserFields = EMPTY_BROWSER_FIELDS;
  if ((tGridProps as TGridIntegratedProps).browserFields != null) {
    browserFields = (tGridProps as TGridIntegratedProps).browserFields;
  }
  return (
    <Provider store={tGridStore!}>
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
export * from './draggables';
export * from './last_updated';
export * from './loading';
