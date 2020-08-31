/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const SHOWING = i18n.translate(
  'xpack.securitySolution.anomaliesTable.table.showingDescription',
  {
    defaultMessage: 'Showing',
  }
);

export const ANOMALIES = i18n.translate(
  'xpack.securitySolution.anomaliesTable.table.anomaliesDescription',
  {
    defaultMessage: 'Anomalies',
  }
);

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.anomaliesTable.table.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {anomaly} other {anomalies}}`,
  });

export const TOOLTIP = i18n.translate(
  'xpack.securitySolution.anomaliesTable.table.anomaliesTooltip',
  {
    defaultMessage: 'The anomalies table is not filterable via the SIEM global KQL search.',
  }
);

export const SCORE = i18n.translate('xpack.securitySolution.ml.table.scoreTitle', {
  defaultMessage: 'Anomaly score',
});

export const HOST_NAME = i18n.translate('xpack.securitySolution.ml.table.hostNameTitle', {
  defaultMessage: 'Host name',
});

export const INFLUENCED_BY = i18n.translate('xpack.securitySolution.ml.table.influencedByTitle', {
  defaultMessage: 'Influenced by',
});

export const ENTITY = i18n.translate('xpack.securitySolution.ml.table.entityTitle', {
  defaultMessage: 'Entity',
});

export const DETECTOR = i18n.translate('xpack.securitySolution.ml.table.detectorTitle', {
  defaultMessage: 'Job',
});

export const NETWORK_NAME = i18n.translate('xpack.securitySolution.ml.table.networkNameTitle', {
  defaultMessage: 'Network IP',
});

export const TIME_STAMP = i18n.translate('xpack.securitySolution.ml.table.timestampTitle', {
  defaultMessage: 'Timestamp',
});
