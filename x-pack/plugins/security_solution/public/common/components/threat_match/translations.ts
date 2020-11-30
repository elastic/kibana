/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const FIELD = i18n.translate('xpack.securitySolution.threatMatch.fieldDescription', {
  defaultMessage: 'Field',
});

export const THREAT_FIELD = i18n.translate(
  'xpack.securitySolution.threatMatch.threatFieldDescription',
  {
    defaultMessage: 'Indicator index field',
  }
);

export const FIELD_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.threatMatch.fieldPlaceholderDescription',
  {
    defaultMessage: 'Search',
  }
);

export const MATCHES = i18n.translate('xpack.securitySolution.threatMatch.matchesLabel', {
  defaultMessage: 'MATCHES',
});

export const AND = i18n.translate('xpack.securitySolution.threatMatch.andDescription', {
  defaultMessage: 'AND',
});

export const OR = i18n.translate('xpack.securitySolution.threatMatch.orDescription', {
  defaultMessage: 'OR',
});
