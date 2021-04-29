/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FORM_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.eventFilter.modal.description',
  {
    defaultMessage: "Events are filtered when the rule's conditions are met:",
  }
);

export const NAME_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.eventFilter.form.name.placeholder',
  {
    defaultMessage: 'Event exception name',
  }
);

export const NAME_LABEL = i18n.translate('xpack.securitySolution.eventFilter.form.name.label', {
  defaultMessage: 'Name your event exception',
});

export const NAME_ERROR = i18n.translate('xpack.securitySolution.eventFilter.form.name.error', {
  defaultMessage: "The name can't be empty",
});

export const OS_LABEL = i18n.translate('xpack.securitySolution.eventFilter.form.os.label', {
  defaultMessage: 'Select operating system',
});

export const RULE_NAME = i18n.translate('xpack.securitySolution.eventFilter.form.rule.name', {
  defaultMessage: 'Endpoint Event Filtering',
});
