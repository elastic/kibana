/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils';
import { defaultPalette, Color } from '../../../../../../common/color_palette';

export const nginxRedirectStatusCodes: FormulaValueConfig = {
  label: '300-399',
  value: `count(kql='http.response.status_code >= 300 and http.response.status_code <= 399')`,
  format: {
    id: 'number',
    params: {
      decimals: 0,
    },
  },
  color: defaultPalette[Color.color0],
};
