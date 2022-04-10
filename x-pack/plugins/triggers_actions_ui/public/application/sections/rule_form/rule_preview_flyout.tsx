/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPortal, EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';
import { RulePreview, RulePreviewProps } from './rule_preview';

type RulePreviewFlyoutProps = RulePreviewProps & {
  onClose: () => void;
};

export const RulePreviewFlyout = ({
  potentialRule,
  existingRule,
  onClose,
}: RulePreviewFlyoutProps) => {
  return (
    <EuiPortal>
      <EuiFlyout
        onClose={() => onClose()}
        aria-labelledby="flyoutRulePreviewTitle"
        size="m"
        maxWidth={620}
        ownFocus={false}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h3 id="flyoutTitle">Diagnose rule</h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <RulePreview potentialRule={potentialRule} existingRule={existingRule} />
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
};
