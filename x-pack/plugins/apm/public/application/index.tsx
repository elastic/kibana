/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
//import { ApplicationMountContext } from '../../../../../src/core/public';

export const renderApp = (context: any, domElement: HTMLElement) => {
  ReactDOM.render(<h1>hi</h1>, domElement);
  return () => ReactDOM.unmountComponentAtNode(domElement);
};
