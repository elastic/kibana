/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CLOSE_BUTTON = i18n.translate(
  'xpack.securitySolution.ruleSources.closeRuleSourcesModalTitle',
  {
    defaultMessage: 'Close',
  }
);

export const RULE_SOURCES_FLYOUT_TITLE = i18n.translate(
  'xpack.securitySolution.ruleSources.ruleSourcesTitle',
  {
    defaultMessage: 'Manage rule sources',
  }
);

export const RULE_SOURCES_EMPTY_PROMPT_TITLE = i18n.translate(
  'xpack.securitySolution.ruleSources.emptyPromptTitle',
  {
    defaultMessage: 'No rule sources configured',
  }
);

export const RULE_SOURCES_EMPTY_PROMPT_BODY = i18n.translate(
  'xpack.securitySolution.ruleSources.emptyPromptBody',
  {
    defaultMessage: 'Add rule sources to install prebuilt rules from external repositories.',
  }
);

export const RULE_SOURCES_EMPTY_PROMPT_BUTTON = i18n.translate(
  'xpack.securitySolution.ruleSources.emptyPromptButton',
  {
    defaultMessage: 'Add rule source',
  }
);

export const RULES_SOURCE_GITHUB_REPOSITORY_TITLE = i18n.translate(
  'xpack.securitySolution.ruleSources.githubRepositoryTitle',
  {
    defaultMessage: 'GitHub repository',
  }
);

export const RULES_SOURCE_GITHUB_REPOSITORY_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.ruleSources.githubRepositoryDescription',
  {
    defaultMessage: 'Detection rules will be fetched from this repository.',
  }
);

export const RULE_SOURCE_SAVE_BUTTON = i18n.translate(
  'xpack.securitySolution.ruleSources.saveButton',
  {
    defaultMessage: 'Save',
  }
);

export const RULE_SOURCE_CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.ruleSources.cancelButton',
  {
    defaultMessage: 'Cancel',
  }
);
