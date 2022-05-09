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

export const CALL_OUT_DEPRECATED_TITLE = i18n.translate(
  'xpack.securitySolution.indexPatterns.callOutDeprecxatedTitle',
  {
    defaultMessage: 'This timeline uses a legacy data view selector',
  }
);

export const CALL_OUT_DEPRECATED_TEMPLATE_TITLE = i18n.translate(
  'xpack.securitySolution.indexPatterns.callOutDeprecxatedTemplateTitle',
  {
    defaultMessage: 'This timeline template uses a legacy data view selector',
  }
);

export const CALL_OUT_MISSING_PATTERNS_TITLE = i18n.translate(
  'xpack.securitySolution.indexPatterns.callOutMissingPatternsTitle',
  {
    defaultMessage: 'This timeline is out of date with the Security Data View',
  }
);

export const CALL_OUT_MISSING_PATTERNS_TEMPLATE_TITLE = i18n.translate(
  'xpack.securitySolution.indexPatterns.callOutMissingPatternsTemplateTitle',
  {
    defaultMessage: 'This timeline template is out of date with the Security Data View',
  }
);

export const CALL_OUT_TIMELINE_TITLE = i18n.translate(
  'xpack.securitySolution.indexPatterns.callOutTimelineTitle',
  {
    defaultMessage: 'Data view cannot be modified when show only detection alerts is selected',
  }
);

export const TOGGLE_TO_NEW_SOURCERER = i18n.translate(
  'xpack.securitySolution.indexPatterns.toggleToNewSourcerer.link',
  {
    defaultMessage: 'here',
  }
);

export const DATA_VIEW = i18n.translate('xpack.securitySolution.indexPatterns.dataViewLabel', {
  defaultMessage: 'Data view',
});

export const UPDATE_DATA_VIEW = i18n.translate(
  'xpack.securitySolution.indexPatterns.updateDataView',
  {
    defaultMessage:
      'Would you like to add this index pattern to Security Data View? Otherwise, we can recreate the data view without the missing index patterns.',
  }
);

export const UPDATE_SECURITY_DATA_VIEW = i18n.translate(
  'xpack.securitySolution.indexPatterns.updateSecurityDataView',
  {
    defaultMessage: 'Update Security Data View',
  }
);

export const CONTINUE_WITHOUT_ADDING = i18n.translate(
  'xpack.securitySolution.indexPatterns.continue',
  {
    defaultMessage: 'Continue without adding',
  }
);
export const ADD_INDEX_PATTERN = i18n.translate('xpack.securitySolution.indexPatterns.add', {
  defaultMessage: 'Add index pattern',
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

export const DEPRECATED_BADGE_TITLE = i18n.translate(
  'xpack.securitySolution.indexPatterns.updateAvailableBadgeTitle',
  {
    defaultMessage: 'Update available',
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

export const DISABLED_SOURCERER = i18n.translate('xpack.securitySolution.sourcerer.disabled', {
  defaultMessage: 'The updates to the Data view require a page reload to take effect.',
});

export const UPDATE_INDEX_PATTERNS = i18n.translate('xpack.securitySolution.indexPatterns.update', {
  defaultMessage: 'Update and recreate data view',
});

export const INDEX_PATTERNS_RESET = i18n.translate(
  'xpack.securitySolution.indexPatterns.resetButton',
  {
    defaultMessage: 'Reset',
  }
);

export const INDEX_PATTERNS_CLOSE = i18n.translate(
  'xpack.securitySolution.indexPatterns.closeButton',
  {
    defaultMessage: 'Close',
  }
);

export const INACTIVE_PATTERNS = i18n.translate('xpack.securitySolution.indexPatterns.inactive', {
  defaultMessage: 'Inactive index patterns',
});

export const NO_DATA = i18n.translate('xpack.securitySolution.indexPatterns.noData', {
  defaultMessage:
    "The index pattern on this timeline doesn't match any data streams, indices, or index aliases.",
});

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

export const SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.securitySolution.indexPatterns.successToastTitle',
  {
    defaultMessage: 'One or more settings require you to reload the page to take effect',
  }
);

export const RELOAD_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.indexPatterns.reloadPageTitle',
  {
    defaultMessage: 'Reload page',
  }
);

export const FAILURE_TOAST_TITLE = i18n.translate(
  'xpack.securitySolution.indexPatterns.failureToastTitle',
  {
    defaultMessage: 'Unable to update data view',
  }
);
