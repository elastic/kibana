/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core-http-browser';
import { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import { runSoon } from './rule_api';

export async function runRule(http: HttpSetup, toasts: IToasts, id: string) {
  try {
    const message = await runSoon({ http, id });
    if (message) {
      toasts.addWarning({ title: message });
    } else {
      toasts.addSuccess({
        title: i18n.translate('xpack.triggersActionsUI.sections.rulesList.ableToRunRuleSoon', {
          defaultMessage: 'Your rule is scheduled to run',
        }),
      });
    }
  } catch (e) {
    toasts.addError(e, {
      title: i18n.translate('xpack.triggersActionsUI.sections.rulesList.unableToRunRuleSoon', {
        defaultMessage: 'Unable to schedule your rule to run',
      }),
    });
  }
}
