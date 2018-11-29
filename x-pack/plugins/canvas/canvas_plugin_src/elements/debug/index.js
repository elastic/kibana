/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import header from './header.png';

export const debug = () => ({
  name: 'debug',
  displayName: 'Debug',
  help: 'Just dumps the configuration of the element',
  image: header,
  expression: `demodata
| render as=debug`,
});
