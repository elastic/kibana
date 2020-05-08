/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from 'kibana/public';
import { createKbnUrlStateStorage } from '../../../../src/plugins/kibana_utils/public/';
import { PipelineAppDeps } from './types';
import { App } from './app';

export const mountApp = (
  coreStart: CoreStart,
  deps: PipelineAppDeps,
  { element, history }: AppMountParameters
) => {
  const kbnUrlStateStorage = createKbnUrlStateStorage({
    history,
    useHash: coreStart.uiSettings.get('state:storeInSessionStorage'),
  });

  ReactDOM.render(
    <App
      deps={deps}
      coreStart={coreStart}
      history={history}
      kbnUrlStateStorage={kbnUrlStateStorage}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
