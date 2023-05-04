/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UNIQUE_IPS = i18n.translate('xpack.securitySolution.kpiHosts.uniqueIps.title', {
  defaultMessage: 'Unique IPs',
});

export const SOURCE_UNIT_LABEL = i18n.translate(
  'xpack.securitySolution.kpiHosts.uniqueIps.sourceUnitLabel',
  {
    defaultMessage: 'source',
  }
);

export const DESTINATION_UNIT_LABEL = i18n.translate(
  'xpack.securitySolution.kpiHosts.uniqueIps.destinationUnitLabel',
  {
    defaultMessage: 'destination',
  }
);

export const SOURCE_CHART_LABEL = i18n.translate(
  'xpack.securitySolution.kpiHosts.uniqueIps.sourceChartLabel',
  {
    defaultMessage: 'Src.',
  }
);

export const DESTINATION_CHART_LABEL = i18n.translate(
  'xpack.securitySolution.kpiHosts.uniqueIps.destinationChartLabel',
  {
    defaultMessage: 'Dest.',
  }
);
