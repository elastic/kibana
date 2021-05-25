/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { I18nProvider } from '@kbn/i18n/react';
import { DragDropContext } from 'react-beautiful-dnd';
import { getReduxDeps } from '../store/t_grid';

import { TGrid as TGridComponent } from './tgrid';
import { TGridProps } from '../types';

export const TGrid = (props: TGridProps & { store: any }) => {
  const reduxStuff = getReduxDeps(props.type);
  console.log('TGrid', props.type);
  // if (props.type === 'standalone') {
  return (
    <Provider store={props.store}>
      <I18nProvider>
        <DragDropContext>
          <TGridComponent {...props} />
        </DragDropContext>
      </I18nProvider>
    </Provider>
  );
  // } else {
  //   return (
  //     <I18nProvider>
  //       <TGridComponent {...props} />
  //     </I18nProvider>
  //   );
  // }
};

// eslint-disable-next-line import/no-default-export
export { TGrid as default };

export * from './drag_and_drop';
export * from './draggables';
export * from './last_updated';
export * from './loading';
