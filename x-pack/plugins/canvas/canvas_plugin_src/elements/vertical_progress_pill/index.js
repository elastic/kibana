/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import header from './header.png';

export const verticalProgressPill = () => ({
  name: 'verticalProgressPill',
  displayName: 'Vertical progress pill',
  help: 'Displays progress as a portion of a vertical pill',
  width: 80,
  height: 400,
  image: header,
  expression: `filters
| demodata
| math "mean(percent_uptime)"
| progress shape="verticalPill" label={formatnumber 0%} font={font size=24 family="${
    openSans.value
  }" color="#000000" align=center}
| render`,
});
