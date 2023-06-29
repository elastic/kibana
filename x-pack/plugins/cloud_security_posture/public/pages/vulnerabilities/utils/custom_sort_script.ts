/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const VULNERABILITY_SEVERITY_FIELD = 'vulnerability.severity';
import { i18n } from '@kbn/i18n';

export const severitySchemaConfig = {
  type: 'severitySchema',
  detector() {
    return 0; // this schema is always explicitly defined
  },
  sortTextAsc: i18n.translate('xpack.csp.vulnerabilityTable.column.sortAscending', {
    defaultMessage: 'Low -> Critical',
  }),
  sortTextDesc: i18n.translate('xpack.csp.vulnerabilityTable.column.sortDescending', {
    defaultMessage: 'Critical -> Low',
  }),
  icon: 'dot',
  color: '',
};

export const severitySortScript = (direction: string) => ({
  _script: {
    type: 'number',
    script: {
      lang: 'painless',
      inline:
        "if(params.scores.containsKey(doc['vulnerability.severity'].value)) { return params.scores[doc['vulnerability.severity'].value];} return 1000;",
      params: {
        scores: {
          LOW: 0,
          MEDIUM: 1,
          HIGH: 2,
          CRITICAL: 3,
        },
      },
    },
    order: direction,
  },
});
