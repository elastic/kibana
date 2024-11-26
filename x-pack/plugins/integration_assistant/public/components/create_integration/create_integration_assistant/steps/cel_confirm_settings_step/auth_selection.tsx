/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiCallOut, EuiComboBox, EuiFlexGroup, EuiFormRow } from '@elastic/eui';
import * as i18n from './translations';

interface AuthSelectionProps {
  selectedAuth: string | undefined;
  authOptions: EuiComboBoxOptionOption[];
  invalidAuth: boolean;
  onChangeAuth(update: EuiComboBoxOptionOption[]): void;
}

export const AuthSelection = React.memo<AuthSelectionProps>(
  ({ selectedAuth, authOptions, invalidAuth, onChangeAuth }) => {
    return (
      <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="confirmSettingsStep">
        <EuiFormRow label={'Preferred method'}>
          <EuiComboBox
            singleSelection={{ asPlainText: true }}
            fullWidth
            options={authOptions}
            selectedOptions={selectedAuth === undefined ? undefined : [{ label: selectedAuth }]}
            onChange={onChangeAuth}
          />
        </EuiFormRow>
        {invalidAuth && (
          <EuiCallOut
            title={i18n.AUTH_DOES_NOT_ALIGN}
            size="s"
            color="warning"
            iconType="warning"
          />
        )}
      </EuiFlexGroup>
    );
  }
);
AuthSelection.displayName = 'AuthSelection';
