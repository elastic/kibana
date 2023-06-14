/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const bulkApplyTimelineTemplate = {
  FORM_TITLE: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.applyTimelineTemplate.formTitle',
    {
      defaultMessage: 'Apply Timeline template',
    }
  ),

  TEMPLATE_SELECTOR_LABEL: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.applyTimelineTemplate.templateSelectorLabel',
    {
      defaultMessage: 'Apply Timeline template to selected rules',
    }
  ),

  TEMPLATE_SELECTOR_HELP_TEXT: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.applyTimelineTemplate.templateSelectorHelpText',
    {
      defaultMessage:
        'Select which Timeline to apply to selected rules when investigating generated alerts.',
    }
  ),

  TEMPLATE_SELECTOR_PLACEHOLDER: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.applyTimelineTemplate.templateSelectorPlaceholder',
    {
      defaultMessage: 'Search Timeline template',
    }
  ),

  TEMPLATE_SELECTOR_DEFAULT_VALUE: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.applyTimelineTemplate.templateSelectorDefaultValue',
    {
      defaultMessage: 'None',
    }
  ),

  warningCalloutMessage: (rulesCount: number): JSX.Element => (
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.applyTimelineTemplate.warningCalloutMessage"
      defaultMessage="You're about to apply changes to {rulesCount, plural, one {# selected rule} other {# selected rules}}.
      If you previously applied Timeline templates to these rules, they will be overwritten or (if you select 'None') reset to none."
      values={{ rulesCount }}
    />
  ),
};

export const bulkAddRuleActions = {
  FORM_TITLE: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.addRuleActions.formTitle',
    {
      defaultMessage: 'Add rule actions',
    }
  ),

  OVERWRITE_LABEL: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.addRuleActions.overwriteCheckboxLabel',
    {
      defaultMessage: 'Overwrite all selected rules actions',
    }
  ),

  RULE_VARIABLES_DETAIL: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.addRuleActions.ruleVariablesDetail',
    {
      defaultMessage:
        'Rule variables may affect only some of the rules you select, based on the rule types (for example, \\u007b\\u007bcontext.rule.threshold\\u007d\\u007d will only display values for threshold rules).',
    }
  ),
};

export const bulkSetSchedule = {
  FORM_TITLE: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.setSchedule.formTitle',
    {
      defaultMessage: 'Update rule schedules',
    }
  ),
  INTERVAL_LABEL: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.setSchedule.intervalLabel',
    {
      defaultMessage: 'Runs every',
    }
  ),
  INTERVAL_HELP_TEXT: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.setSchedule.intervalHelpText',
    {
      defaultMessage: 'Rules run periodically and detect alerts within the specified time frame.',
    }
  ),
  LOOKBACK_LABEL: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.setSchedule.lookbackLabel',
    {
      defaultMessage: 'Additional look-back time',
    }
  ),
  LOOKBACK_HELP_TEXT: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.setSchedule.lookbackHelpText',
    {
      defaultMessage: 'Adds time to the look-back period to prevent missed alerts.',
    }
  ),
  warningCalloutMessage: (rulesCount: number): JSX.Element => (
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.setSchedule.warningCalloutMessage"
      defaultMessage="You're about to apply changes to {rulesCount, plural, one {# selected rule} other {# selected rules}}. The changes you make will overwrite the existing rule schedules and additional look-back time (if any)."
      values={{ rulesCount }}
    />
  ),
};

export const bulkDuplicateRuleActions = {
  MODAL_TITLE: (rulesCount: number): JSX.Element => (
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.duplicate.exception.confirmation.modalTitle"
      defaultMessage="Duplicate {rulesCount, plural, one {the rule} other {rules}}?"
      values={{ rulesCount }}
    />
  ),

  MODAL_TEXT: (rulesCount: number): JSX.Element => (
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.duplicate.exceptionsConfirmation.modalBody"
      defaultMessage="You're duplicating {rulesCount, plural, one {# rule} other {# rules}}. Choose what to duplicate:"
      values={{ rulesCount }}
    />
  ),

  DUPLICATE_EXCEPTIONS_TEXT: (rulesCount: number) => (
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.duplicate.exceptionsConfirmation.with"
      defaultMessage="The {rulesCount, plural, one {rule} other {rules}} and {rulesCount, plural, one {its} other {their}} active exceptions"
      values={{ rulesCount }}
    />
  ),

  DUPLICATE_EXCEPTIONS_INCLUDE_EXPIRED_EXCEPTIONS_LABEL: (rulesCount: number) => (
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.duplicate.includeExpiredExceptionsCheckboxLabel"
      defaultMessage="The {rulesCount, plural, one {rule} other {rules}} and {rulesCount, plural, one {its} other {their}} exceptions"
      values={{ rulesCount }}
    />
  ),

  DUPLICATE_WITHOUT_EXCEPTIONS_TEXT: (rulesCount: number) => (
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.duplicate.exceptionsConfirmation.without"
      defaultMessage="Only the {rulesCount, plural, one {rule} other {rules}}"
      values={{ rulesCount }}
    />
  ),

  CONTINUE_BUTTON: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.duplicate.exceptionsConfirmation.continueButton',
    {
      defaultMessage: 'Duplicate',
    }
  ),

  CANCEL_BUTTON: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.duplicate.exceptionsConfirmation.cancelButton',
    {
      defaultMessage: 'Cancel',
    }
  ),

  DUPLICATE_TOOLTIP: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.duplicate.exceptionsConfirmation.tooltip',
    {
      defaultMessage:
        'Exception items associated with individual rules are duplicated. Exception items linked to shared exception lists are not. Instead, duplicated rules will reference the shared exception lists that contain the exception items.',
    }
  ),
};
