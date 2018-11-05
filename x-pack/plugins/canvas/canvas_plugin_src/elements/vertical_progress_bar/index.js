/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { openSans } from '../../../common/lib/fonts';
import header from './header.png';

export const verticalProgressBar = () => ({
  name: 'verticalProgressBar',
  displayName: i18n.translate('xpack.canvas.elements.verticalProgressBarDisplayName', {
    defaultMessage: 'Vertical Progress Bar',
  }),
  help: i18n.translate('xpack.canvas.elements.verticalProgressBarHelpText', {
    defaultMessage: 'Displays progress as a portion of a vertical bar',
  }),
  width: 80,
  height: 400,
  image: header,
  expression: `filters
| demodata
| math "mean(percent_uptime)"
| progress shape="verticalBar" label={formatnumber 0%} font={font size=24 family="${
    openSans.value
  }" color="#000000" align=center}
| render`,
});
