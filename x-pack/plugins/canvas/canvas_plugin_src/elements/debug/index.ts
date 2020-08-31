/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../../../types';

export const debug: ElementFactory = () => ({
  name: 'debug',
  displayName: 'Debug data',
  help: 'Just dumps the configuration of the element',
  icon: 'bug',
  expression: `demodata
| render as=debug`,
});
