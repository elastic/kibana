/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { openSans } from '../../../common/lib/fonts';
import header from './header.png';

export const horizontalProgressPill = () => ({
  name: 'horizontalProgressPill',
  displayName: i18n.translate('xpack.canvas.elements.horizontalProgressPillDisplayName', {
    defaultMessage: 'Horizontal Progress Pill',
  }),
  help: i18n.translate('xpack.canvas.elements.horizontalProgressPillHelpText', {
    defaultMessage: 'Displays progress as a portion of a horizontal pill',
  }),
  width: 400,
  height: 30,
  image: header,
  expression: `filters
| demodata
| math "mean(percent_uptime)"
| progress shape="horizontalPill" label={formatnumber 0%} font={font size=24 family="${
    openSans.value
  }" color="#000000" align=center}
| render`,
});
