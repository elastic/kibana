/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import { ViewStrings } from '../../../i18n';
import { SetupInitializer } from '../../plugin';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/public';

const { Metric: strings } = ViewStrings;

export const metricInitializer: SetupInitializer<unknown> = (core, plugin) => {
  return () => ({
    name: 'metric',
    displayName: strings.getDisplayName(),
    modelArgs: [['_', { label: strings.getNumberDisplayName() }]],
    requiresContext: false,
    args: [
      {
        name: 'metricFormat',
        displayName: strings.getMetricFormatDisplayName(),
        help: strings.getMetricFormatHelp(),
        argType: 'numberFormat',
        default: `"${core.uiSettings.get(UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN)}"`,
      },
      {
        name: '_',
        displayName: strings.getLabelDisplayName(),
        help: strings.getLabelHelp(),
        argType: 'string',
        default: '""',
      },
      {
        name: 'metricFont',
        displayName: strings.getMetricFontDisplayName(),
        help: strings.getMetricFontHelp(),
        argType: 'font',
        default: `{font size=48 family="${openSans.value}" color="#000000" align=center lHeight=48}`,
      },
      {
        name: 'labelFont',
        displayName: strings.getLabelFontDisplayName(),
        help: strings.getLabelFontHelp(),
        argType: 'font',
        default: `{font size=18 family="${openSans.value}" color="#000000" align=center}`,
      },
    ],
  });
};
