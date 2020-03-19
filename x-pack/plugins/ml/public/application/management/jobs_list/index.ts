/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import React from 'react';
import { CoreStart } from 'kibana/public';
import { JobsListPage } from './components';

export const renderApp = (element: HTMLElement, coreStart: CoreStart) => {
  const I18nContext = coreStart.i18n.Context;
  ReactDOM.render(React.createElement(JobsListPage, { I18nContext }), element);
  return () => {
    unmountComponentAtNode(element);
  };
};
