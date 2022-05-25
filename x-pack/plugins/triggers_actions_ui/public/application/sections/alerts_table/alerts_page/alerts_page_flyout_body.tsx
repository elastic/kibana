/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import {
  EuiFlexGroup,
  EuiTitle,
  EuiFlexItem,
  EuiSpacer,
  EuiLoadingContent,
  EuiText,
} from '@elastic/eui';
import { AlertsField, AlertsTableFlyoutBaseProps } from '../../../../types';

const NAME_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.name',
  {
    defaultMessage: 'Name',
  }
);

const REASON_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.reason',
  {
    defaultMessage: 'Reason',
  }
);

type Props = AlertsTableFlyoutBaseProps;
const AlertsFlyoutBody = ({ alert, isLoading }: Props) => {
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" direction="column">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h4>{NAME_LABEL}</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        {isLoading ? (
          <EuiLoadingContent lines={1} />
        ) : (
          <EuiText size="s" data-test-subj="alertsFlyoutName">
            {get(alert as any, AlertsField.name, [])[0]}
          </EuiText>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h4>{REASON_LABEL}</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        {isLoading ? (
          <EuiLoadingContent lines={3} />
        ) : (
          <EuiText size="s" data-test-subj="alertsFlyoutReason">
            {get(alert as any, AlertsField.reason, [])[0]}
          </EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default AlertsFlyoutBody;
