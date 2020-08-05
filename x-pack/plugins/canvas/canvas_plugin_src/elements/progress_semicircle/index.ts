/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import { ElementFactory } from '../../../types';

export const progressSemicircle: ElementFactory = () => ({
  name: 'progressSemicircle',
  displayName: 'Semicircle',
  type: 'progress',
  help: 'Displays progress as a portion of a semicircle',
  width: 200,
  height: 100,
  expression: `filters
| demodata
| math "mean(percent_uptime)"
| progress shape="semicircle" label={formatnumber 0%} font={font size=24 family="${openSans.value}" color="#000000" align=center}
| render`,
});
