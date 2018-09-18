/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import header from './header.png';

export const revealImage = () => ({
  name: 'revealImage',
  displayName: 'Image reveal',
  help: 'Reveals a percentage of an image',
  image: header,
  expression: `filters
| demodata
| math "sum(min(cost) / max(cost))"
| revealImage origin=bottom image=null
| render`,
});
