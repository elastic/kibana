/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CALL_OUT_TITLE = i18n.translate('xpack.securitySolution.indexPatterns.callOutTitle', {
  defaultMessage: 'Data view cannot be modified on this page',
});

export const CALL_OUT_TIMELINE_TITLE = i18n.translate(
  'xpack.securitySolution.indexPatterns.callOutTimelineTitle',
  {
    defaultMessage: 'Data view cannot be modified when show only detection alerts is selected',
  }
);

export const DATA_VIEW = i18n.translate('xpack.securitySolution.indexPatterns.dataViewLabel', {
  defaultMessage: 'Data view',
});
export const MODIFIED_BADGE_TITLE = i18n.translate(
  'xpack.securitySolution.indexPatterns.modifiedBadgeTitle',
  {
    defaultMessage: 'Modified',
  }
);

export const ALERTS_BADGE_TITLE = i18n.translate(
  'xpack.securitySolution.indexPatterns.alertsBadgeTitle',
  {
    defaultMessage: 'Alerts',
  }
);

export const SECURITY_DEFAULT_DATA_VIEW_LABEL = i18n.translate(
  'xpack.securitySolution.indexPatterns.securityDefaultDataViewLabel',
  {
    defaultMessage: 'Security Default Data View',
  }
);

export const SIEM_SECURITY_DATA_VIEW_LABEL = i18n.translate(
  'xpack.securitySolution.indexPatterns.securityDataViewLabel',
  {
    defaultMessage: 'Security Data View',
  }
);

export const SELECT_DATA_VIEW = i18n.translate(
  'xpack.securitySolution.indexPatterns.selectDataView',
  {
    defaultMessage: 'Data view selection',
  }
);

export const SAVE_INDEX_PATTERNS = i18n.translate('xpack.securitySolution.indexPatterns.save', {
  defaultMessage: 'Save',
});

export const INDEX_PATTERNS_CHOOSE_DATA_VIEW_LABEL = i18n.translate(
  'xpack.securitySolution.indexPatterns.chooseDataViewLabel',
  {
    defaultMessage: 'Choose data view',
  }
);

export const INDEX_PATTERNS_ADVANCED_OPTIONS_TITLE = i18n.translate(
  'xpack.securitySolution.indexPatterns.advancedOptionsTitle',
  {
    defaultMessage: 'Advanced options',
  }
);

export const INDEX_PATTERNS_LABEL = i18n.translate(
  'xpack.securitySolution.indexPatterns.indexPatternsLabel',
  {
    defaultMessage: 'Index patterns',
  }
);

export const INDEX_PATTERNS_DESCRIPTIONS = i18n.translate(
  'xpack.securitySolution.indexPatterns.descriptionsLabel',
  {
    defaultMessage:
      'These are the index patterns currently selected. Filtering out index patterns from your data view can help improve overall performance.',
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

export const ALERTS_CHECKBOX_LABEL = i18n.translate(
  'xpack.securitySolution.indexPatterns.onlyDetectionAlertsLabel',
  {
    defaultMessage: 'Show only detection alerts',
  }
);
