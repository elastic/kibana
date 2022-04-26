/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBottomBar, EuiButton } from '@elastic/eui';
import * as TEST_SUBJECTS from './test_subjects';
import * as TEXT from './translations';

interface RulesBottomBarProps {
  onSave(): void;
  onCancel(): void;
  isLoading: boolean;
}

export const RulesBottomBar = ({ onSave, onCancel, isLoading }: RulesBottomBarProps) => (
  <EuiBottomBar
    style={{
      // .euiFlyout + 1
      zIndex: 1001,
    }}
  >
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiButton size="m" iconType="cross" isLoading={isLoading} onClick={onCancel} color="ghost">
          {TEXT.CANCEL}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="m"
          iconType="save"
          isLoading={isLoading}
          onClick={onSave}
          fill
          data-test-subj={TEST_SUBJECTS.CSP_RULES_SAVE_BUTTON}
        >
          {TEXT.SAVE}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiBottomBar>
);
