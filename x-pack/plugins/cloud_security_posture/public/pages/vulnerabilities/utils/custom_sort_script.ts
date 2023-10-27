/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
        "if(doc.containsKey('vulnerability.severity') && !doc['vulnerability.severity'].empty && doc['vulnerability.severity'].size()!=0 && doc['vulnerability.severity'].value!=null && params.scores.containsKey(doc['vulnerability.severity'].value)) { return params.scores[doc['vulnerability.severity'].value];} return 0;",
      params: {
        scores: {
          LOW: 1,
          MEDIUM: 2,
          HIGH: 3,
          CRITICAL: 4,
        },
      },
    },
    order: direction,
  },
});

/**
 * Generates Painless sorting in case-insensitive manner
 */
export const getCaseInsensitiveSortScript = (field: string, direction: string) => {
  return {
    _script: {
      type: 'string',
      order: direction,
      script: {
        source: `doc["${field}"].value.toLowerCase()`,
        lang: 'painless',
      },
    },
  };
};
