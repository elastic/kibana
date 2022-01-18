/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BACK_TO_DETECTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.backOptionsHeader',
  {
    defaultMessage: 'Back to detections',
  }
);
export const POPOVER_TOOLTIP_ARIA_LABEL = (columnName: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.popoverTooltip.ariaLabel', {
    defaultMessage: 'Tooltip for column: {columnName}',
    values: { columnName },
  });

export const IMPORT_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.importRuleTitle',
  {
    defaultMessage: 'Import rules',
  }
);

export const UPLOAD_VALUE_LISTS = i18n.translate(
  'xpack.securitySolution.lists.detectionEngine.rules.uploadValueListsButton',
  {
    defaultMessage: 'Upload value lists',
  }
);

export const UPLOAD_VALUE_LISTS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.lists.detectionEngine.rules.uploadValueListsButtonTooltip',
  {
    defaultMessage:
      'Use value lists to create an exception when a field value matches a value found in a list',
  }
);

export const ADD_NEW_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.addNewRuleTitle',
  {
    defaultMessage: 'Create new rule',
  }
);

export const PAGE_TITLE = i18n.translate('xpack.securitySolution.detectionEngine.rules.pageTitle', {
  defaultMessage: 'Rules',
});

export const ADD_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.addPageTitle',
  {
    defaultMessage: 'Create',
  }
);

export const EDIT_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.editPageTitle',
  {
    defaultMessage: 'Edit',
  }
);

export const REFRESH = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.refreshTitle',
  {
    defaultMessage: 'Refresh',
  }
);

export const BATCH_ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.batchActionsTitle',
  {
    defaultMessage: 'Bulk actions',
  }
);

export const ACTIVE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.activeRuleDescription',
  {
    defaultMessage: 'active',
  }
);

export const INACTIVE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.inactiveRuleDescription',
  {
    defaultMessage: 'inactive',
  }
);

export const BULK_ACTION_ENABLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.enableTitle',
  {
    defaultMessage: 'Enable',
  }
);

export const BULK_ACTION_DISABLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.disableTitle',
  {
    defaultMessage: 'Disable',
  }
);

export const BULK_ACTION_EXPORT = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.exportTitle',
  {
    defaultMessage: 'Export',
  }
);

export const BULK_ACTION_DUPLICATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.duplicateTitle',
  {
    defaultMessage: 'Duplicate',
  }
);

export const BULK_ACTION_DELETE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.deleteTitle',
  {
    defaultMessage: 'Delete',
  }
);

export const BULK_ACTION_ADD_INDEX_PATTERNS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.addIndexPattersTitle',
  {
    defaultMessage: 'Add index patterns',
  }
);

export const BULK_ACTION_DELETE_INDEX_PATTERNS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.deleteIndexPattersTitle',
  {
    defaultMessage: 'Delete index patterns',
  }
);

export const BULK_EDIT_CONFIRMATION_TITLE = (elasticRulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.bulkEditConfirmationTitle',
    {
      values: { elasticRulesCount },
      defaultMessage:
        '{elasticRulesCount} {elasticRulesCount, plural, =1 {Elastic rule} other {Elastic rules}} cannot be edited',
    }
  );

export const BULK_EDIT_REJECT_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.bulkEditReject',
  {
    defaultMessage:
      'Elastic rules are not modifiable. The update action will only be applied to Custom rules.',
  }
);

export const BULK_EDIT_CONFIRMATION_BODY = (elasticRulesCount: number, customRulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.bulkEditConfirmationBody',
    {
      values: { elasticRulesCount, customRulesCount },
      defaultMessage:
        'You are about to edit {elasticRulesCount} {elasticRulesCount, plural, =1 {Elastic rule} other {Elastic rules}}, the update action will only be applied to {customRulesCount} {customRulesCount, plural, =1 {Custom rule} other {Custom rules}} you’ve selected.',
    }
  );

export const BULK_EDIT_CONFIRMATION_CANCEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditConfirmationCancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const BULK_EDIT_CONFIRMATION_CONFIRM = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditConfirmationConfirmButtonLabel',
  {
    defaultMessage: 'Edit custom rules',
  }
);

export const BULK_EDIT_FLYOUT_FORM_SAVE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutFormSaveButtonLabel',
  {
    defaultMessage: 'Save',
  }
);

export const BULK_EDIT_FLYOUT_FORM_CLOSE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutFormCloseButtonLabel',
  {
    defaultMessage: 'CLose',
  }
);

export const BATCH_ACTION_ACTIVATE_SELECTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.batchActions.activateSelectedTitle',
  {
    defaultMessage: 'Activate selected',
  }
);

export const BATCH_ACTION_ACTIVATE_SELECTED_ERROR = (totalRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.batchActions.activateSelectedErrorTitle',
    {
      values: { totalRules },
      defaultMessage: 'Error activating {totalRules, plural, =1 {rule} other {rules}}',
    }
  );

export const BATCH_ACTION_DEACTIVATE_SELECTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.batchActions.deactivateSelectedTitle',
  {
    defaultMessage: 'Deactivate selected',
  }
);

export const BATCH_ACTION_DEACTIVATE_SELECTED_ERROR = (totalRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.batchActions.deactivateSelectedErrorTitle',
    {
      values: { totalRules },
      defaultMessage: 'Error deactivating {totalRules, plural, =1 {rule} other {rules}}',
    }
  );

export const BATCH_ACTION_EXPORT_SELECTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.batchActions.exportSelectedTitle',
  {
    defaultMessage: 'Export selected',
  }
);

export const BATCH_ACTION_DUPLICATE_SELECTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.batchActions.duplicateSelectedTitle',
  {
    defaultMessage: 'Duplicate selected',
  }
);

export const BATCH_ACTION_DELETE_SELECTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.batchActions.deleteSelectedTitle',
  {
    defaultMessage: 'Delete selected',
  }
);

export const BATCH_ACTION_DELETE_SELECTED_IMMUTABLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.batchActions.deleteSelectedImmutableTitle',
  {
    defaultMessage: 'Selection contains immutable rules which cannot be deleted',
  }
);

export const BATCH_ACTION_DELETE_SELECTED_ERROR = (totalRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.batchActions.deleteSelectedErrorTitle',
    {
      values: { totalRules },
      defaultMessage: 'Error deleting {totalRules, plural, =1 {rule} other {rules}}',
    }
  );

export const EXPORT_FILENAME = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.exportFilenameTitle',
  {
    defaultMessage: 'rules_export',
  }
);

export const SUCCESSFULLY_EXPORTED_RULES = (exportedRules: number, totalRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.successfullyExportedXofYRulesTitle',
    {
      values: { totalRules, exportedRules },
      defaultMessage:
        'Successfully exported {exportedRules} of {totalRules} {totalRules, plural, =1 {rule} other {rules}}. Prebuilt rules were excluded from the resulting file.',
    }
  );

export const ALL_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.tableTitle',
  {
    defaultMessage: 'All rules',
  }
);

export const SEARCH_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.searchAriaLabel',
  {
    defaultMessage: 'Search rules',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.searchPlaceholder',
  {
    defaultMessage: 'e.g. rule name',
  }
);

export const SHOWING_RULES = (totalRules: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.allRules.showingRulesTitle', {
    values: { totalRules },
    defaultMessage: 'Showing {totalRules} {totalRules, plural, =1 {rule} other {rules}}',
  });

export const SELECT_ALL_RULES = (totalRules: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.allRules.selectAllRulesTitle', {
    values: { totalRules },
    defaultMessage: 'Select all {totalRules} {totalRules, plural, =1 {rule} other {rules}}',
  });

export const CLEAR_SELECTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.clearSelectionTitle',
  {
    defaultMessage: 'Clear selection',
  }
);

export const SELECTED_RULES = (selectedRules: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.allRules.selectedRulesTitle', {
    values: { selectedRules },
    defaultMessage: 'Selected {selectedRules} {selectedRules, plural, =1 {rule} other {rules}}',
  });

export const EDIT_RULE_SETTINGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.actions.editRuleSettingsDescription',
  {
    defaultMessage: 'Edit rule settings',
  }
);

export const EDIT_RULE_SETTINGS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.actions.editRuleSettingsToolTip',
  {
    defaultMessage: 'You do not have Kibana Actions privileges',
  }
);

export const DUPLICATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.actions.duplicateTitle',
  {
    defaultMessage: 'Duplicate',
  }
);

export const DUPLICATE_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.actions.duplicateRuleDescription',
  {
    defaultMessage: 'Duplicate rule',
  }
);

export const SUCCESSFULLY_DUPLICATED_RULES = (totalRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.successfullyDuplicatedRulesTitle',
    {
      values: { totalRules },
      defaultMessage:
        'Successfully duplicated {totalRules, plural, =1 {{totalRules} rule} other {{totalRules} rules}}',
    }
  );

export const DUPLICATE_RULE_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.actions.duplicateRuleErrorDescription',
  {
    defaultMessage: 'Error duplicating rule',
  }
);

export const BULK_ACTION_FAILED = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.actions.bulkActionFailedDescription',
  {
    defaultMessage: 'Failed to execute bulk action',
  }
);

export const EXPORT_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.actions.exportRuleDescription',
  {
    defaultMessage: 'Export rule',
  }
);

export const DELETE_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.actions.deleteeRuleDescription',
  {
    defaultMessage: 'Delete rule',
  }
);

export const COLUMN_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.ruleTitle',
  {
    defaultMessage: 'Rule',
  }
);

export const COLUMN_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.riskScoreTitle',
  {
    defaultMessage: 'Risk score',
  }
);

export const COLUMN_SEVERITY = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.severityTitle',
  {
    defaultMessage: 'Severity',
  }
);

export const COLUMN_LAST_COMPLETE_RUN = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.lastRunTitle',
  {
    defaultMessage: 'Last run',
  }
);

export const COLUMN_LAST_UPDATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.lastUpdateTitle',
  {
    defaultMessage: 'Last updated',
  }
);

export const COLUMN_LAST_RESPONSE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.lastResponseTitle',
  {
    defaultMessage: 'Last response',
  }
);

export const COLUMN_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.versionTitle',
  {
    defaultMessage: 'Version',
  }
);

export const COLUMN_TAGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.tagsTitle',
  {
    defaultMessage: 'Tags',
  }
);

export const COLUMN_SEE_ALL_POPOVER = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.tagsPopoverTitle',
  {
    defaultMessage: 'See all',
  }
);

export const COLUMN_ACTIVATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.activateTitle',
  {
    defaultMessage: 'Activated',
  }
);

export const COLUMN_INDEXING_TIMES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.indexingTimes',
  {
    defaultMessage: 'Indexing Time (ms)',
  }
);

export const COLUMN_INDEXING_TIMES_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.indexingTimesTooltip',
  {
    defaultMessage: 'Total time spent indexing alerts during last Rule execution',
  }
);

export const COLUMN_QUERY_TIMES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.queryTimes',
  {
    defaultMessage: 'Query Time (ms)',
  }
);

export const COLUMN_QUERY_TIMES_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.queryTimesTooltip',
  {
    defaultMessage: 'Total time spent querying source indices during last Rule execution',
  }
);

export const COLUMN_GAP = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.gap',
  {
    defaultMessage: 'Last Gap (if any)',
  }
);

export const RULES_TAB = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.tabs.rules',
  {
    defaultMessage: 'Rules',
  }
);

export const MONITORING_TAB = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.tabs.monitoring',
  {
    defaultMessage: 'Rule Monitoring',
  }
);

export const EXCEPTIONS_TAB = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.tabs.exceptions',
  {
    defaultMessage: 'Exception Lists',
  }
);

export const CUSTOM_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.filters.customRulesTitle',
  {
    defaultMessage: 'Custom rules',
  }
);

export const ELASTIC_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.filters.elasticRulesTitle',
  {
    defaultMessage: 'Elastic rules',
  }
);

export const TAGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.filters.tagsLabel',
  {
    defaultMessage: 'Tags',
  }
);

export const NO_TAGS_AVAILABLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.filters.noTagsAvailableDescription',
  {
    defaultMessage: 'No tags available',
  }
);

export const NO_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.filters.noRulesTitle',
  {
    defaultMessage: 'No rules found',
  }
);

export const NO_RULES_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.filters.noRulesBodyTitle',
  {
    defaultMessage: "We weren't able to find any rules with the above filters.",
  }
);

export const DEFINE_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.defineRuleTitle',
  {
    defaultMessage: 'Define rule',
  }
);

export const ABOUT_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.aboutRuleTitle',
  {
    defaultMessage: 'About rule',
  }
);

export const SCHEDULE_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.scheduleRuleTitle',
  {
    defaultMessage: 'Schedule rule',
  }
);

export const RULE_ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.ruleActionsTitle',
  {
    defaultMessage: 'Rule actions',
  }
);

export const DEFINITION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.stepDefinitionTitle',
  {
    defaultMessage: 'Definition',
  }
);

export const ABOUT = i18n.translate('xpack.securitySolution.detectionEngine.rules.stepAboutTitle', {
  defaultMessage: 'About',
});

export const SCHEDULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.stepScheduleTitle',
  {
    defaultMessage: 'Schedule',
  }
);

export const ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.stepActionsTitle',
  {
    defaultMessage: 'Actions',
  }
);

export const OPTIONAL_FIELD = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.optionalFieldDescription',
  {
    defaultMessage: 'Optional',
  }
);

export const CONTINUE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.continueButtonTitle',
  {
    defaultMessage: 'Continue',
  }
);

export const UPDATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.updateButtonTitle',
  {
    defaultMessage: 'Update',
  }
);

export const DELETE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.deleteDescription',
  {
    defaultMessage: 'Delete',
  }
);

export const IMPORT_RULE_BTN_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.importRuleTitle',
  {
    defaultMessage: 'Import',
  }
);

export const SELECT_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.selectRuleDescription',
  {
    defaultMessage:
      'Select rules to import. Associated rule actions and exceptions can be included.',
  }
);

export const INITIAL_PROMPT_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.initialPromptTextDescription',
  {
    defaultMessage: 'Select or drag and drop a valid rules_export.ndjson file',
  }
);

export const OVERWRITE_WITH_SAME_NAME = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.overwriteDescription',
  {
    defaultMessage: 'Overwrite existing detection rules with conflicting "rule_id"',
  }
);

export const SUCCESSFULLY_IMPORTED_RULES = (totalRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.components.importRuleModal.successfullyImportedRulesTitle',
    {
      values: { totalRules },
      defaultMessage:
        'Successfully imported {totalRules} {totalRules, plural, =1 {rule} other {rules}}',
    }
  );

export const IMPORT_FAILED = (totalRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.components.importRuleModal.importFailedTitle',
    {
      values: { totalRules },
      defaultMessage: 'Failed to import {totalRules} {totalRules, plural, =1 {rule} other {rules}}',
    }
  );

export const IMPORT_FAILED_DETAILED = (message: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.components.importRuleModal.importFailedDetailedTitle',
    {
      values: { message },
      defaultMessage: '{message}',
    }
  );

export const REFRESH_PROMPT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.refreshPromptTitle',
  {
    defaultMessage: 'Are you still there?',
  }
);

export const REFRESH_PROMPT_CONFIRM = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.refreshPromptConfirm',
  {
    defaultMessage: 'Continue',
  }
);

export const REFRESH_PROMPT_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.refreshPromptBody',
  {
    defaultMessage: 'Rule auto-refresh has been paused. Click "Continue" to resume.',
  }
);

export const DELETE_CONFIRMATION_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.deleteConfirmationTitle',
  {
    defaultMessage: 'Confirm bulk deletion',
  }
);

export const DELETE_CONFIRMATION_CONFIRM = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.deleteConfirmationConfirm',
  {
    defaultMessage: 'Confirm',
  }
);

export const DELETE_CONFIRMATION_CANCEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.deleteConfirmationCancel',
  {
    defaultMessage: 'Cancel',
  }
);

export const DELETE_CONFIRMATION_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.deleteConfirmationBody',
  {
    defaultMessage:
      'This action will delete all rules that match current filter query. Click "Confirm" to continue.',
  }
);

export const REFRESH_RULE_POPOVER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.refreshRulePopoverDescription',
  {
    defaultMessage: 'Automatically refresh table',
  }
);

export const REFRESH_RULE_POPOVER_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.refreshRulePopoverLabel',
  {
    defaultMessage: 'Refresh settings',
  }
);

export const SHOWING_EXCEPTION_LISTS = (totalLists: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.allRules.showingExceptionLists', {
    values: { totalLists },
    defaultMessage: 'Showing {totalLists} {totalLists, plural, =1 {list} other {lists}}',
  });
