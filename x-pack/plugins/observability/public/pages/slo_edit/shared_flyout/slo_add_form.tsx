/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FormattedMessage } from '@kbn/i18n-react';

import React from 'react';
import { EuiTitle, EuiFlyoutHeader, EuiFlyout, EuiFlyoutBody, EuiPortal } from '@elastic/eui';
import { RecursivePartial } from '@kbn/utility-types';
import { merge } from 'lodash';
import { CreateSLOForm } from '../types';
import { SloEditForm } from '../components/slo_edit_form';

function SloAddFormFlyout({
  onClose,
  initialValues,
}: {
  onClose: () => void;
  initialValues?: RecursivePartial<CreateSLOForm>;
}) {
  return (
    <EuiPortal>
      <EuiFlyout
        onClose={onClose}
        aria-labelledby="flyoutRuleAddTitle"
        size="l"
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
          <SloEditForm
            onSave={() => {
              onClose();
            }}
            initialValues={
              initialValues
                ? merge(
                    {
                      indicator: {
                        type: 'sli.kql.custom',
                      },
                      objective: {
                        target: 99,
                      },
                      timeWindow: {
                        duration: '30d',
                        type: 'rolling',
                      },
                      budgetingMethod: 'occurrences',
                    },
                    { ...initialValues }
                  )
                : undefined
            }
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}

// eslint-disable-next-line import/no-default-export
export default SloAddFormFlyout;
