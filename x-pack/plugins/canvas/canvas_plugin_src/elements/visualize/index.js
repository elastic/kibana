/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import header from './header.png';

export const visualize = () => ({
  name: 'visualize',
  displayName: 'Kibana Visualization',
  help: 'A visualization created in Kibana',
  image: header,
  expression: `filters
| visualize id=""
| render`,
});
