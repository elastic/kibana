/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { I18nProvider } from '@kbn/i18n/react';
import { getReduxDeps } from '../store/t_grid';

import { TGrid } from './tgrid';
import { TimelineProps } from '../types';

export const Timeline = (props: TimelineProps) => {
  const reduxStuff = getReduxDeps(props.type);
  if (props.type === 'standalone') {
    return (
      <Provider store={reduxStuff}>
        <I18nProvider>
          <TGrid {...props} />
        </I18nProvider>
      </Provider>
    );
  } else {
    return (
      <I18nProvider>
        <TGrid {...props} />
      </I18nProvider>
    );
  }
};

// eslint-disable-next-line import/no-default-export
export { Timeline as default };
