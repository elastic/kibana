/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import React from 'react';

export const ResponseActionsHeader = () => {
  return (
    <>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        data-test-subj={'response-actions-header'}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                defaultMessage="Response Actions"
                id="xpack.securitySolution.actionForm.responseActionSectionsDescription"
              />
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBetaBadge
            tooltipContent={i18n.translate(
              'xpack.securitySolution.actionForm.experimentalTooltip',
              {
                defaultMessage:
                  'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
              }
            )}
            label={i18n.translate('xpack.securitySolution.rules.actionForm.experimentalTitle', {
              defaultMessage: 'Technical preview',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      <EuiFlexItem>
        <FormattedMessage
          defaultMessage="Response actions are run on each rule execution"
          id="xpack.securitySolution.actionForm.responseActionSectionsTitle"
        />
      </EuiFlexItem>
      <EuiSpacer size="m" />
    </>
  );
};
