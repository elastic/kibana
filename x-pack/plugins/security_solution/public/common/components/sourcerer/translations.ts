/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const SOURCERER = i18n.translate('xpack.securitySolution.indexPatterns.sourcerer', {
  defaultMessage: 'Index patterns',
});

export const ALL_DEFAULT = i18n.translate('xpack.securitySolution.indexPatterns.allDefault', {
  defaultMessage: 'All default',
});

export const SELECT_INDEX_PATTERNS = i18n.translate('xpack.securitySolution.indexPatterns.help', {
  defaultMessage: 'Select index patterns',
});

export const SAVE_INDEX_PATTERNS = i18n.translate('xpack.securitySolution.indexPatterns.save', {
  defaultMessage: 'Save',
});

export const CONFIGURE_INDEX_PATTERNS = i18n.translate(
  'xpack.securitySolution.indexPatterns.configure',
  {
    defaultMessage:
      'Configure additional Kibana index patterns to see them become available in the Security Solution',
  }
);

export const DISABLED_INDEX_PATTERNS = i18n.translate(
  'xpack.securitySolution.indexPatterns.disabled',
  {
    defaultMessage:
      'Disabled index patterns are recommended on this page, but first need to be configured in your Kibana index pattern settings',
  }
);
