/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SOURCERER = i18n.translate('xpack.securitySolution.indexPatterns.dataSourcesLabel', {
  defaultMessage: 'Data sources',
});

export const ALL_DEFAULT = i18n.translate('xpack.securitySolution.indexPatterns.allDefault', {
  defaultMessage: 'All default',
});

export const SELECT_INDEX_PATTERNS = i18n.translate('xpack.securitySolution.indexPatterns.help', {
  defaultMessage: 'Data sources selection',
});

export const SAVE_INDEX_PATTERNS = i18n.translate('xpack.securitySolution.indexPatterns.save', {
  defaultMessage: 'Save',
});

export const INDEX_PATTERNS_SELECTION_LABEL = i18n.translate(
  'xpack.securitySolution.indexPatterns.selectionLabel',
  {
    defaultMessage: 'Choose the source of the data on this page',
  }
);

export const DISABLED_INDEX_PATTERNS = i18n.translate(
  'xpack.securitySolution.indexPatterns.disabled',
  {
    defaultMessage:
      'Disabled index patterns are recommended on this page, but first need to be configured in your Kibana index pattern settings',
  }
);

export const INDEX_PATTERNS_RESET = i18n.translate(
  'xpack.securitySolution.indexPatterns.resetButton',
  {
    defaultMessage: 'Reset',
  }
);

export const PICK_INDEX_PATTERNS = i18n.translate(
  'xpack.securitySolution.indexPatterns.pickIndexPatternsCombo',
  {
    defaultMessage: 'Pick index patterns',
  }
);
