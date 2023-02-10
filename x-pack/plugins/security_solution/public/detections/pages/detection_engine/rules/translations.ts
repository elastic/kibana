/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

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

export const IMPORT_VALUE_LISTS = i18n.translate(
  'xpack.securitySolution.lists.detectionEngine.rules.importValueListsButton',
  {
    defaultMessage: 'Import value lists',
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
    defaultMessage: 'Apply Timeline template',
  }
);

export const BULK_ACTION_ADD_RULE_ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.addRuleActionsTitle',
  {
    defaultMessage: 'Add rule actions',
  }
);

export const BULK_ACTION_SET_SCHEDULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.setScheduleTitle',
  {
    defaultMessage: 'Update rule schedules',
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

export const BULK_EXPORT_CONFIRMATION_REJECTED_TITLE = (rulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.bulkExportConfirmationDeniedTitle',
    {
      values: { rulesCount },
      defaultMessage: '{rulesCount, plural, =1 {# rule} other {# rules}} cannot be exported',
    }
  );

export const BULK_EDIT_CONFIRMATION_REJECTED_TITLE = (rulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.bulkEditConfirmationDeniedTitle',
    {
      values: { rulesCount },
      defaultMessage: '{rulesCount, plural, =1 {# rule} other {# rules}} cannot be edited',
    }
  );

export const BULK_ACTION_CONFIRMATION_PARTLY_TITLE = (customRulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.bulkActionConfirmationPartlyTitle',
    {
      values: { customRulesCount },
      defaultMessage:
        'This action can only be applied to {customRulesCount, plural, =1 {# custom rule} other {# custom rules}}',
    }
  );

export const BULK_EDIT_CONFIRMATION_CANCEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditConfirmationCancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const BULK_ACTION_CONFIRMATION_CLOSE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkActionConfirmationCloseButtonLabel',
  {
    defaultMessage: 'Close',
  }
);

export const BULK_EDIT_CONFIRMATION_CONFIRM = (customRulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditConfirmation.confirmButtonLabel',
    {
      values: { customRulesCount },
      defaultMessage: 'Edit {customRulesCount, plural, =1 {# custom rule} other {# custom rules}}',
    }
  );

export const BULK_EXPORT_CONFIRMATION_CONFIRM = (customRulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkExportConfirmation.confirmButtonLabel',
    {
      values: { customRulesCount },
      defaultMessage:
        'Export {customRulesCount, plural, =1 {# custom rule} other {# custom rules}}',
    }
  );

export const BULK_EDIT_FLYOUT_FORM_SAVE = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.saveButtonLabel',
  {
    defaultMessage: 'Save',
  }
);

export const BULK_EDIT_FLYOUT_FORM_CANCEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.cancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.addIndexPatternsComboboxHelpText',
  {
    defaultMessage:
      'Enter the pattern of Elasticsearch indices that you would like to add. By default, the dropdown includes index patterns defined in Security Solution advanced settings.',
  }
);

export const BULK_EDIT_FLYOUT_FORM_DELETE_INDEX_PATTERNS_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.deleteIndexPatternsComboboxHelpText',
  {
    defaultMessage:
      'Enter the pattern of Elasticsearch indices that you would like to delete. By default, the dropdown includes index patterns defined in Security Solution advanced settings.',
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
    defaultMessage: "Overwrite all selected rules' index patterns",
  }
);

export const BULK_EDIT_FLYOUT_FORM_DATA_VIEWS_OVERWRITE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.dataViewsOverwriteCheckboxLabel',
  {
    defaultMessage: 'Apply changes to rules configured with data views',
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
    defaultMessage: "Overwrite all selected rules' tags",
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

export const SEARCH_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.searchAriaLabel',
  {
    defaultMessage: 'Search rules',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.searchPlaceholder',
  {
    defaultMessage:
      'Rule name, index pattern (e.g., "filebeat-*"), or MITRE ATT&CK™ tactic or technique (e.g., "Defense Evasion" or "TA0005")',
  }
);

export const SHOWING_RULES = (firstInPage: number, lastOfPage: number, totalRules: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.allRules.showingRulesTitle', {
    values: { firstInPage, lastOfPage, totalRules },
    defaultMessage:
      'Showing {firstInPage}-{lastOfPage} of {totalRules} {totalRules, plural, =1 {rule} other {rules}}',
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

export const LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.actions.lackOfKibanaActionsFeaturePrivileges',
  {
    defaultMessage: 'You do not have Kibana Actions privileges',
  }
);

export const LACK_OF_KIBANA_SECURITY_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.actions.lackOfKibanaSecurityPrivileges',
  {
    defaultMessage: 'You do not have Kibana Security privileges',
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

export const COLUMN_TAGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.columns.tagsTitle',
  {
    defaultMessage: 'Tags',
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

export const ENABLED_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.filters.enabledRulesTitle',
  {
    defaultMessage: 'Enabled rules',
  }
);

export const DISABLED_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.filters.disabledRulesTitle',
  {
    defaultMessage: 'Disabled rules',
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

export const SEARCH_TAGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.filters.searchTagsPlaceholder',
  {
    defaultMessage: 'Search tags',
  }
);

export const RULES_TAG_SEARCH = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.filters.rulesTagSearchText',
  {
    defaultMessage: 'Rules tag search',
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

export const CLEAR_RULES_TABLE_FILTERS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.clearRulesTableFilters',
  {
    defaultMessage: 'Clear filters',
  }
);

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
        'Successfully exported {exportedRules} of {totalRules} {totalRules, plural, =1 {rule} other {rules}}.',
    }
  );

export const RULES_BULK_EXPORT_PREBUILT_RULES_EXCLUDED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.export.prebuiltRulesExcludedToastDescription',
  {
    defaultMessage: 'Prebuilt rules were excluded from the resulting file.',
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

export const RULES_BULK_EDIT_SUCCESS_DESCRIPTION = (
  succeededRulesCount: number,
  skippedRulesCount: number
) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.successToastDescription',
    {
      values: { succeededRulesCount, skippedRulesCount },
      defaultMessage: `{succeededRulesCount, plural, =0 {} =1 {You've successfully updated # rule. } other {You've successfully updated # rules. }}
        {skippedRulesCount, plural, =0 {} =1 { # rule was skipped.} other { # rules were skipped.}}
        `,
    }
  );

export const RULES_BULK_EDIT_SUCCESS_DATA_VIEW_RULES_SKIPPED_DETAIL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.successIndexEditToastDescription',
  {
    defaultMessage:
      'If you did not select to apply changes to rules using Kibana data views, those rules were not updated and will continue using data views.',
  }
);

export const RULES_BULK_EDIT_FAILURE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.errorToastTitle',
  {
    defaultMessage: 'Error updating rules',
  }
);

export const RULES_BULK_EDIT_FAILURE_DESCRIPTION = (
  failedRulesCount: number,
  skippedRulesCount: number
) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.errorToastDescription',
    {
      values: { failedRulesCount, skippedRulesCount },
      defaultMessage:
        '{failedRulesCount, plural, =0 {} =1 {# rule} other {# rules}} failed to update. {skippedRulesCount, plural, =0 {} =1 { # rule was skipped.} other { # rules were skipped.}}',
    }
  );

export const RULE_PREVIEW_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.rulePreviewTitle',
  {
    defaultMessage: 'Rule preview',
  }
);

export const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.cancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const SAVED_QUERY_LOAD_ERROR_TOAST = i18n.translate(
  'xpack.securitySolution.hooks.useGetSavedQuery.errorToastMessage',
  {
    defaultMessage: 'Failed to load the saved query',
  }
);
