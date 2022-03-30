/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EndValue } from '../../../../../../../src/plugins/chart_expressions/expression_xy/common';

export const endValueDefinitions: Array<{ id: EndValue } & Record<string, string>> = [
  {
    id: 'None',
    title: i18n.translate('xpack.lens.endValue.none', {
      defaultMessage: 'Hide',
    }),
    description: i18n.translate('xpack.lens.endValueDescription.none', {
      defaultMessage: 'Do not extend series to the edge of the chart',
    }),
  },
  {
    id: 'Zero',
    title: i18n.translate('xpack.lens.endValue.zero', {
      defaultMessage: 'Zero',
    }),
    description: i18n.translate('xpack.lens.endValueDescription.zero', {
      defaultMessage: 'Extend series as zero to the edge of the chart',
    }),
  },
  {
    id: 'Nearest',
    title: i18n.translate('xpack.lens.endValue.nearest', {
      defaultMessage: 'Nearest',
    }),
    description: i18n.translate('xpack.lens.endValueDescription.nearest', {
      defaultMessage: 'Extend series with the first/last value to the edge of the chart',
    }),
  },
];
