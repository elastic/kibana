/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import React from 'react';
import { EuiTitle, EuiFlyoutHeader, EuiFlyout, EuiFlyoutBody, EuiPortal } from '@elastic/eui';

import { SloEditForm } from './pages/slo_edit/components/slo_edit_form';

function SloAddForm() {
  return (
    <EuiPortal>
      <EuiFlyout
        onClose={() => {}}
        aria-labelledby="flyoutRuleAddTitle"
        size="m"
        maxWidth={620}
        ownFocus
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s" data-test-subj="addRuleFlyoutTitle">
            <h3 id="flyoutTitle">
              <FormattedMessage
                defaultMessage="Create SLO"
                id="xpack.triggersActionsUI.sections.ruleAdd.flyoutTitle"
              />
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <SloEditForm />
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}

export { SloAddForm as default };
