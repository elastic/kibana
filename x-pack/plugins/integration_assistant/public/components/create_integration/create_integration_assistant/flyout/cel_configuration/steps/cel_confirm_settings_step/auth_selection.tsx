/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiBadge, EuiCallOut, EuiComboBox, EuiFlexGroup, EuiFormRow } from '@elastic/eui';
import * as i18n from './translations';
import { translatedAuthValue } from './cel_confirm_step';

const AUTH_OPTIONS = ['Basic', 'OAuth2', 'Digest', 'API Token'];

const isRecommended = (auth: string, specDefinedAuthTypes: string[]): boolean => {
  return specDefinedAuthTypes.includes(translatedAuthValue(auth));
};

interface AuthSelectionProps {
  selectedAuth: string | undefined;
  specifiedAuthForPath: string[];
  invalidAuth: boolean;
  onChangeAuth(update: EuiComboBoxOptionOption[]): void;
}

export const AuthSelection = React.memo<AuthSelectionProps>(
  ({ selectedAuth, specifiedAuthForPath, invalidAuth, onChangeAuth }) => {
    const options = AUTH_OPTIONS.map<EuiComboBoxOptionOption>((option) =>
      isRecommended(option, specifiedAuthForPath)
        ? {
            id: option,
            label: option,
            append: <EuiBadge>{i18n.RECOMMENDED}</EuiBadge>,
          }
        : { id: option, label: option }
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="confirmAuth">
        <EuiFormRow label={i18n.AUTH_SELECTION_TITLE} fullWidth>
          <EuiComboBox
            singleSelection={{ asPlainText: true }}
            fullWidth
            options={options}
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
