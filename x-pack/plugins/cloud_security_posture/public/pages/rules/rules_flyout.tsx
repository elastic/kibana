/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer, EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody } from '@elastic/eui';
import type { RuleSavedObject } from './use_csp_rules';

interface FindingFlyoutProps {
  onClose(): void;
  rule: RuleSavedObject;
}

export const RuleFlyout = ({ onClose, rule }: FindingFlyoutProps) => {
  return (
    <EuiFlyout ownFocus={false} onClose={onClose} outsideClickCloses>
      <EuiFlyoutHeader>
        <h1>{rule.attributes.name}</h1>
        <EuiSpacer />
      </EuiFlyoutHeader>
      <EuiFlyoutBody />
    </EuiFlyout>
  );
};
