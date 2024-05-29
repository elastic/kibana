/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeProviderDecorator } from '@kbn/kibana-react-plugin/common';
import * as jest from 'jest-mock';

// Is this gross? yes. but it's the only way I'm able to mock callApmApi
// without jest.mock, which is not available (only jest.spyOn is).
// the gist of it is that it allows Jest to re-define module exports.
const objectDefineProperty = Object.defineProperty;
Object.defineProperty = function (obj, propertyName, attributes) {
  if (obj.__esModule) {
    attributes = { ...attributes, configurable: true };
  }
  return objectDefineProperty(obj, propertyName, attributes);
};

// we also silence warnings from act() which is react thinking
// it is running in a jest test
const originalError = console.error.bind(console.error);
console.error = (msg) => {
  return !msg.toString().includes('act(...)') && originalError(msg);
};

window.jest = jest;

export const decorators = [EuiThemeProviderDecorator];
