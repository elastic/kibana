/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import { ElementFactory } from '../../../types';

export const verticalProgressPill: ElementFactory = () => ({
  name: 'verticalProgressPill',
  displayName: 'Vertical progress pill',
  type: 'progress',
  help: 'Displays progress as a portion of a vertical pill',
  width: 80,
  height: 400,
  expression: `filters
| demodata
| math "mean(percent_uptime)"
| progress shape="verticalPill" label={formatnumber 0%} font={font size=24 family="${openSans.value}" color="#000000" align=center}
| render`,
});
