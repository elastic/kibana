/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import { ElementFactory } from '../../../types';
import { SetupInitializer } from '../../plugin';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/public';

export const metricElementInitializer: SetupInitializer<ElementFactory> = (core, setup) => {
  return () => ({
    name: 'metric',
    displayName: 'Metric',
    type: 'chart',
    help: 'A number with a label',
    width: 200,
    height: 100,
    icon: 'visMetric',
    expression: `filters
  | demodata
  | math "unique(country)"
  | metric "Countries" 
    metricFont={font size=48 family="${openSans.value}" color="#000000" align="center" lHeight=48} 
    labelFont={font size=14 family="${openSans.value}" color="#000000" align="center"}
    metricFormat="${core.uiSettings.get(UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN)}"
  | render`,
  });
};
