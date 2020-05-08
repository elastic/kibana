/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostPolicyResponseActionStatus } from '../../../../../../common/types';

export const POLICY_STATUS_TO_HEALTH_COLOR = Object.freeze<
  { [key in keyof typeof HostPolicyResponseActionStatus]: string }
>({
  success: 'success',
  warning: 'warning',
  failure: 'danger',
});
