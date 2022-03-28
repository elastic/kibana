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

export const EXPERIMENTAL_ON = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.experimentalOn',
  {
    defaultMessage: 'Technical preview: On',
  }
);

export const EXPERIMENTAL_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.experimentalDescription',
  {
    defaultMessage:
      'The experimental rules table view is in technical preview and allows for advanced sorting capabilities. If you experience performance issues when working with the table, you can turn this setting off.',
  }
);

export const EXPERIMENTAL_OFF = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.experimentalOff',
  {
    defaultMessage: 'Technical preview: Off',
  }
);

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

export const BULK_ACTION_INDEX_PATTERNS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.indexPatternsTitle',
  {
    defaultMessage: 'Index patterns',
  }
);

export const BULK_ACTION_TAGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.tagsTitle',
  {
    defaultMessage: 'Tags',
  }
);

export const BULK_ACTION_ADD_INDEX_PATTERNS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.addIndexPatternsTitle',
  {
    defaultMessage: 'Add index patterns',
  }
);

export const BULK_ACTION_DELETE_INDEX_PATTERNS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.deleteIndexPatternsTitle',
  {
    defaultMessage: 'Delete index patterns',
  }
);

export const BULK_ACTION_ADD_TAGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.addTagsTitle',
  {
    defaultMessage: 'Add tags',
  }
);

export const BULK_ACTION_DELETE_TAGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.deleteTagsTitle',
  {
    defaultMessage: 'Delete tags',
  }
);

export const BULK_ACTION_APPLY_TIMELINE_TEMPLATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.applyTimelineTemplateTitle',
  {
    defaultMessage: 'Apply timeline template',
  }
);

export const BULK_ACTION_MENU_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.contextMenuTitle',
  {
    defaultMessage: 'Options',
  }
);

export const BULK_EDIT_WARNING_TOAST_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.bulkEditWarningToastTitle',
  {
    defaultMessage: 'Rules updates are in progress',
  }
);

export const BULK_EDIT_WARNING_TOAST_DESCRIPTION = (rulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.bulkEditWarningToastDescription',
    {
      values: { rulesCount },
      defaultMessage: '{rulesCount, plural, =1 {# rule is} other {# rules are}} updating.',
    }
  );

export const BULK_EDIT_WARNING_TOAST_NOTIFY = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.bulkEditWarningToastNotifyButtonLabel',
  {
    defaultMessage: `Notify me when done`,
  }
);

export const BULK_EDIT_CONFIRMATION_TITLE = (elasticRulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.bulkEditConfirmationTitle',
    {
      values: { elasticRulesCount },
      defaultMessage:
        '{elasticRulesCount, plural, =1 {# Elastic rule} other {# Elastic rules}} cannot be edited',
    }
  );

export const BULK_EDIT_CONFIRMATION_CANCEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditConfirmationCancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const BULK_EDIT_CONFIRMATION_CONFIRM = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditConfirmation.confirmButtonLabel',
  {
    defaultMessage: 'Edit custom rules',
  }
);

export const BULK_EDIT_FLYOUT_FORM_SAVE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.saveButtonLabel',
  {
    defaultMessage: 'Save',
  }
);

export const BULK_EDIT_FLYOUT_FORM_CLOSE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.closeButtonLabel',
  {
    defaultMessage: 'Close',
  }
);

export const BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.addIndexPatternsComboboxHelpText',
  {
    defaultMessage:
      'Select default index patterns of Elasticsearch indices from the dropdown. You can add custom index patterns and hit Enter to begin a new one.',
  }
);

export const BULK_EDIT_FLYOUT_FORM_DELETE_INDEX_PATTERNS_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.deleteIndexPatternsComboboxHelpText',
  {
    defaultMessage:
      'Delete default index patterns of Elasticsearch indices from the dropdown. You can add custom index patterns and hit Enter to begin a new one.',
  }
);

export const BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.addIndexPatternsComboboxLabel',
  {
    defaultMessage: 'Add index patterns for selected rules',
  }
);

export const BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_REQUIRED_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.indexPatternsRequiredErrorMessage',
  {
    defaultMessage: 'A minimum of one index pattern is required.',
  }
);

export const BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.addIndexPatternsTitle',
  {
    defaultMessage: 'Add index patterns',
  }
);

export const BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_OVERWRITE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.addIndexPatternsOverwriteCheckboxLabel',
  {
    defaultMessage: 'Overwrite all selected rules index patterns',
  }
);

export const BULK_EDIT_FLYOUT_FORM_DELETE_INDEX_PATTERNS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.deleteIndexPatternsComboboxLabel',
  {
    defaultMessage: 'Delete index patterns for selected rules',
  }
);

export const BULK_EDIT_FLYOUT_FORM_DELETE_INDEX_PATTERNS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.deleteIndexPatternsTitle',
  {
    defaultMessage: 'Delete index patterns',
  }
);

export const BULK_EDIT_FLYOUT_FORM_ADD_TAGS_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.addTagsComboboxHelpText',
  {
    defaultMessage:
      'Add one or more tags for selected rules from the dropdown. You can also enter custom identifying tags and press Enter to begin a new one.',
  }
);

export const BULK_EDIT_FLYOUT_FORM_DELETE_TAGS_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.deleteTagsComboboxHelpText',
  {
    defaultMessage:
      'Delete one or more tags for selected rules from the dropdown. You can also enter custom identifying tags and press Enter to begin a new one.',
  }
);

export const BULK_EDIT_FLYOUT_FORM_ADD_TAGS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.addTagsComboboxLabel',
  {
    defaultMessage: 'Add tags for selected rules',
  }
);

export const BULK_EDIT_FLYOUT_FORM_TAGS_REQUIRED_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.tagsComoboxRequiredErrorMessage',
  {
    defaultMessage: 'A minimum of one tag is required.',
  }
);

export const BULK_EDIT_FLYOUT_FORM_ADD_TAGS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.addTagsTitle',
  {
    defaultMessage: 'Add tags',
  }
);

export const BULK_EDIT_FLYOUT_FORM_ADD_TAGS_OVERWRITE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.addTagsOverwriteCheckboxLabel',
  {
    defaultMessage: 'Overwrite all selected rules tags',
  }
);

export const BULK_EDIT_FLYOUT_FORM_DELETE_TAGS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.deleteTagsComboboxLabel',
  {
    defaultMessage: 'Delete tags for selected rules',
  }
);

export const BULK_EDIT_FLYOUT_FORM_DELETE_TAGS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.deleteTagsTitle',
  {
    defaultMessage: 'Delete tags',
  }
);

export const BATCH_ACTION_DELETE_SELECTED_IMMUTABLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.batchActions.deleteSelectedImmutableTitle',
  {
    defaultMessage: 'Selection contains immutable rules which cannot be deleted',
  }
);

export const EXPORT_FILENAME = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.exportFilenameTitle',
  {
    defaultMessage: 'rules_export',
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

export const EXPORT_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.actions.exportRuleDescription',
  {
    defaultMessage: 'Export rule',
  }
);

export const DELETE_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.actions.deleteRuleDescription',
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

export const COLUMN_ENABLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.enabledTitle',
  {
    defaultMessage: 'Enabled',
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

export const COLUMN_GAP_TOOLTIP_SEE_DOCUMENTATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.gapTooltipSeeDocsDescription',
  {
    defaultMessage: 'see documentation',
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

/**
 * Bulk Export
 */

export const RULES_BULK_EXPORT_SUCCESS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.export.successToastTitle',
  {
    defaultMessage: 'Rules exported',
  }
);

export const RULES_BULK_EXPORT_SUCCESS_DESCRIPTION = (exportedRules: number, totalRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.export.successToastDescription',
    {
      values: { totalRules, exportedRules },
      defaultMessage:
        'Successfully exported {exportedRules} of {totalRules} {totalRules, plural, =1 {rule} other {rules}}. Prebuilt rules were excluded from the resulting file.',
    }
  );

export const RULES_BULK_EXPORT_FAILURE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.export.errorToastTitle',
  {
    defaultMessage: 'Error exporting rules',
  }
);

export const RULES_BULK_EXPORT_FAILURE_DESCRIPTION = (rulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.export.errorToastDescription',
    {
      values: { rulesCount },
      defaultMessage: '{rulesCount, plural, =1 {# rule is} other {# rules are}} failed to export.',
    }
  );

/**
 * Bulk Duplicate
 */

export const RULES_BULK_DUPLICATE_SUCCESS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.duplicate.successToastTitle',
  {
    defaultMessage: 'Rules duplicated',
  }
);

export const RULES_BULK_DUPLICATE_SUCCESS_DESCRIPTION = (totalRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.duplicate.successToastDescription',
    {
      values: { totalRules },
      defaultMessage:
        'Successfully duplicated {totalRules, plural, =1 {{totalRules} rule} other {{totalRules} rules}}',
    }
  );

export const RULES_BULK_DUPLICATE_FAILURE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.duplicate.errorToastTitle',
  {
    defaultMessage: 'Error duplicating rule',
  }
);

export const RULES_BULK_DUPLICATE_FAILURE_DESCRIPTION = (rulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.duplicate.errorToastDescription',
    {
      values: { rulesCount },
      defaultMessage:
        '{rulesCount, plural, =1 {# rule is} other {# rules are}} failed to duplicate.',
    }
  );

/**
 * Bulk Delete
 */

export const RULES_BULK_DELETE_SUCCESS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.delete.successToastTitle',
  {
    defaultMessage: 'Rules deleted',
  }
);

export const RULES_BULK_DELETE_SUCCESS_DESCRIPTION = (totalRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.delete.successToastDescription',
    {
      values: { totalRules },
      defaultMessage:
        'Successfully deleted {totalRules, plural, =1 {{totalRules} rule} other {{totalRules} rules}}',
    }
  );

export const RULES_BULK_DELETE_FAILURE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.delete.errorToastTitle',
  {
    defaultMessage: 'Error deleting rules',
  }
);

export const RULES_BULK_DELETE_FAILURE_DESCRIPTION = (rulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.delete.errorToastDescription',
    {
      values: { rulesCount },
      defaultMessage: '{rulesCount, plural, =1 {# rule is} other {# rules are}} failed to delete.',
    }
  );

/**
 * Bulk Enable
 */

export const RULES_BULK_ENABLE_SUCCESS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.enable.successToastTitle',
  {
    defaultMessage: 'Rules enabled',
  }
);

export const RULES_BULK_ENABLE_SUCCESS_DESCRIPTION = (totalRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkAction.enable.successToastDescription',
    {
      values: { totalRules },
      defaultMessage:
        'Successfully enabled {totalRules, plural, =1 {{totalRules} rule} other {{totalRules} rules}}',
    }
  );

export const RULES_BULK_ENABLE_FAILURE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.enable.errorToastTitle',
  {
    defaultMessage: 'Error enabling rules',
  }
);

export const RULES_BULK_ENABLE_FAILURE_DESCRIPTION = (rulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.enable.errorToastDescription',
    {
      values: { rulesCount },
      defaultMessage: '{rulesCount, plural, =1 {# rule is} other {# rules are}} failed to enable.',
    }
  );

/**
 * Bulk Disable
 */

export const RULES_BULK_DISABLE_SUCCESS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.disable.successToastTitle',
  {
    defaultMessage: 'Rules disabled',
  }
);

export const RULES_BULK_DISABLE_SUCCESS_DESCRIPTION = (totalRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.disable.successToastDescription',
    {
      values: { totalRules },
      defaultMessage:
        'Successfully disabled {totalRules, plural, =1 {{totalRules} rule} other {{totalRules} rules}}',
    }
  );

export const RULES_BULK_DISABLE_FAILURE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.disable.errorToastTitle',
  {
    defaultMessage: 'Error disabling rules',
  }
);

export const RULES_BULK_DISABLE_FAILURE_DESCRIPTION = (rulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.disable.errorToastDescription',
    {
      values: { rulesCount },
      defaultMessage: '{rulesCount, plural, =1 {# rule is} other {# rules are}} failed to disable.',
    }
  );

/**
 * Bulk Edit
 */

export const RULES_BULK_EDIT_SUCCESS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.successToastTitle',
  {
    defaultMessage: 'Rules updated',
  }
);

export const RULES_BULK_EDIT_SUCCESS_DESCRIPTION = (rulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.successToastDescription',
    {
      values: { rulesCount },
      defaultMessage:
        "You've successfully updated {rulesCount, plural, =1 {# rule} other {# rules}}.",
    }
  );

export const RULES_BULK_EDIT_FAILURE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.errorToastTitle',
  {
    defaultMessage: 'Error updating rules',
  }
);

export const RULES_BULK_EDIT_FAILURE_DESCRIPTION = (rulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.errorToastDescription',
    {
      values: { rulesCount },
      defaultMessage: '{rulesCount, plural, =1 {# rule} other {# rules}} failed to update.',
    }
  );
