/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils';

export const requestsPerConnection: FormulaValueConfig = {
  label: i18n.translate('xpack.infra.assetDetails.formulas.nginx.requestsPerConnection', {
    defaultMessage: 'Requests Per Connection',
  }),
  value: 'max(nginx.stubstatus.requests) / max(nginx.stubstatus.handled)',
  format: {
    id: 'number',
    params: {
      decimals: 0,
    },
  },
};
