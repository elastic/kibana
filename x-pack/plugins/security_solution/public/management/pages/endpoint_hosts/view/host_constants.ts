/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { HostStatus, HostPolicyResponseActionStatus } from '../../../../../common/endpoint/types';

export const HOST_STATUS_TO_BADGE_COLOR = Object.freeze<{
  [key in HostStatus]: string;
}>({
  [HostStatus.HEALTHY]: 'success',
  [HostStatus.UNHEALTHY]: 'warning',
  [HostStatus.UPDATING]: 'primary',
  [HostStatus.OFFLINE]: 'default',
  [HostStatus.INACTIVE]: 'default',
  [HostStatus.UNENROLLED]: 'default',
});

export const POLICY_STATUS_TO_HEALTH_COLOR = Object.freeze<{
  [key in keyof typeof HostPolicyResponseActionStatus]: string;
}>({
  success: 'success',
  warning: 'warning',
  failure: 'danger',
  unsupported: 'default',
});

export const POLICY_STATUS_TO_BADGE_COLOR = Object.freeze<{
  [key in keyof typeof HostPolicyResponseActionStatus]: string;
}>({
  success: 'success',
  warning: 'warning',
  failure: 'danger',
  unsupported: 'default',
});

export const POLICY_STATUS_TO_TEXT = Object.freeze<{
  [key in keyof typeof HostPolicyResponseActionStatus]: string;
}>({
  success: i18n.translate('xpack.securitySolution.policyStatusText.success', {
    defaultMessage: 'Success',
  }),
  warning: i18n.translate('xpack.securitySolution.policyStatusText.warning', {
    defaultMessage: 'Warning',
  }),
  failure: i18n.translate('xpack.securitySolution.policyStatusText.failure', {
    defaultMessage: 'Failure',
  }),
  unsupported: i18n.translate('xpack.securitySolution.policyStatusText.unsupported', {
    defaultMessage: 'Unsupported',
  }),
});
