/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import { ElementFactory } from '../../../types';

export const verticalProgressBar: ElementFactory = () => ({
  name: 'verticalProgressBar',
  displayName: 'Vertical progress bar',
  type: 'progress',
  help: 'Displays progress as a portion of a vertical bar',
  width: 80,
  height: 400,
  expression: `filters
| demodata
| math "mean(percent_uptime)"
| progress shape="verticalBar" label={formatnumber 0%} font={font size=24 family="${openSans.value}" color="#000000" align=center}
| render`,
});
