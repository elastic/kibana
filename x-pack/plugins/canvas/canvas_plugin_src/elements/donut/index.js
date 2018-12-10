/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import header from './header.png';

export const donut = () => ({
  name: 'donut',
  displayName: 'Donut chart',
  help: 'A customizable donut chart',
  image: header,
  expression: `filters
| demodata
| pointseries color="project" size="max(price)"
| pie hole=50 labels=false legend="ne"
| render`,
});
