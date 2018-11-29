/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import header from './header.png';

export const tiltedPie = () => ({
  name: 'tiltedPie',
  displayName: 'Tilted pie chart',
  width: 500,
  height: 250,
  help: 'A customizable tilted pie chart',
  image: header,
  expression: `filters
| demodata
| pointseries color="project" size="max(price)"
| pie tilt=0.5
| render`,
});
