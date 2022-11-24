/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatuses,
} from '@kbn/alerting-plugin/common';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';

import { ALERT_STATUS_LICENSE_ERROR, rulesStatusesTranslationsMapping } from '../translations';

export function getHealthColor(status: RuleExecutionStatuses) {
  switch (status) {
    case 'active':
      return 'success';
    case 'error':
      return 'danger';
    case 'ok':
      return 'primary';
    case 'pending':
      return 'accent';
    default:
      return 'subdued';
  }
}

export function getStatusMessage(rule: Rule): string {
  return rule?.executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License
    ? ALERT_STATUS_LICENSE_ERROR
    : rule
    ? rulesStatusesTranslationsMapping[rule.executionStatus.status]
    : '';
}
