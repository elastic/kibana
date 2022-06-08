/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SAVE = i18n.translate('xpack.csp.rules.saveButtonLabel', {
  defaultMessage: 'Save',
});

export const CANCEL = i18n.translate('xpack.csp.rules.cancelButtonLabel', {
  defaultMessage: 'Cancel',
});

export const UNKNOWN_ERROR = i18n.translate('xpack.csp.rules.unknownErrorMessage', {
  defaultMessage: 'Unknown Error',
});

export const REFRESH = i18n.translate('xpack.csp.rules.refreshButtonLabel', {
  defaultMessage: 'Refresh',
});

export const SEARCH = i18n.translate('xpack.csp.rules.searchPlaceholder', {
  defaultMessage: 'Search',
});

export const BULK_ACTIONS = i18n.translate('xpack.csp.rules.bulkActionsButtonLabel', {
  defaultMessage: 'Bulk Actions',
});

export const RULE_NAME = i18n.translate('xpack.csp.rules.rulesTable.rulesTableColumn.nameLabel', {
  defaultMessage: 'Rule Name',
});

export const CIS_SECTION = i18n.translate(
  'xpack.csp.rules.rulesTable.rulesTableColumn.cisSectionLabel',
  { defaultMessage: 'CIS Section' }
);

export const LAST_MODIFIED = i18n.translate(
  'xpack.csp.rules.rulesTable.rulesTableColumn.lastModifiedLabel',
  { defaultMessage: 'Last modified' }
);

export const ENABLED = i18n.translate('xpack.csp.rules.rulesTable.rulesTableColumn.enabledLabel', {
  defaultMessage: 'Enabled',
});

export const DISABLE = i18n.translate('xpack.csp.rules.disableLabel', {
  defaultMessage: 'Disable',
});

export const ENABLE = i18n.translate('xpack.csp.rules.enableLabel', {
  defaultMessage: 'Enable',
});

export const ACTIVATED = i18n.translate('xpack.csp.rules.activatedLabel', {
  defaultMessage: 'Activated',
});

export const MISSING_RULES = i18n.translate('xpack.csp.rules.missingRulesMessage', {
  defaultMessage: 'Rules are missing',
});

export const UPDATE_FAILED = i18n.translate('xpack.csp.rules.updateFailedMessage', {
  defaultMessage: 'Update failed',
});

export const OVERVIEW = i18n.translate('xpack.csp.rules.ruleFlyout.tabs.overviewTabLabel', {
  defaultMessage: 'Overview',
});

export const REMEDIATION = i18n.translate('xpack.csp.rules.ruleFlyout.tabs.remediationTabLabel', {
  defaultMessage: 'Remediation',
});

export const DATA_UPDATE_INFO = i18n.translate('xpack.csp.rules.dataUpdateInfoCallout', {
  defaultMessage:
    'Please note, any changes to your benchmark rules will take effect the next time your resources are evaluated. This can take up to ~5 hours',
});
