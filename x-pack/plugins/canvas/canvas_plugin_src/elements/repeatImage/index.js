/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import header from './header.png';

export const repeatImage = () => ({
  name: 'repeatImage',
  displayName: 'Image repeat',
  help: 'Repeats an image N times',
  image: header,
  expression: `filters
| demodata
| math "mean(cost)"
| repeatImage image=null
| render`,
});
