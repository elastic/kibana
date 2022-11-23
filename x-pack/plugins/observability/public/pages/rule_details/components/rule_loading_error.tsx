/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function RuleLoadingError() {
  return (
    <EuiPanel data-test-subj="rule-loading-error">
      <EuiEmptyPrompt
        iconType="alert"
        color="danger"
        title={
          <h2>
            {i18n.translate('xpack.observability.ruleDetails.errorPromptTitle', {
              defaultMessage: 'Unable to load rule details',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.observability.ruleDetails.errorPromptBody', {
              defaultMessage: 'There was an error loading the rule details.',
            })}
          </p>
        }
      />
    </EuiPanel>
  );
}
