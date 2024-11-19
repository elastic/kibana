/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const EMPTY_POLICY_NAME_HINT = i18n.translate(
  'xpack.fleet.uninstallTokenList.emptyPolicyNameHint',
  {
    defaultMessage:
      "This token's related Agent policy has already been deleted, so the policy name is unavailable.",
  }
);

export const EmptyPolicyNameHint = () => (
  <>
    {'- '}
    <EuiToolTip content={EMPTY_POLICY_NAME_HINT}>
      <EuiIcon
        type="questionInCircle"
        color="subdued"
        aria-label={EMPTY_POLICY_NAME_HINT}
        data-test-subj="emptyPolicyNameHint"
      />
    </EuiToolTip>
  </>
);
