/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiText, EuiSpacer } from '@elastic/eui';

import type { Category } from '../../../../../common/api/log_categorization/types';
import { FormattedPatternExamples, FormattedRegex, FormattedTokens } from '../../format_category';

interface ExpandedRowProps {
  category: Category;
  onClose?(): void;
}

export const ExpandedRow: FC<ExpandedRowProps> = ({ category, onClose }) => {
  return (
    <div css={{ marginRight: '40px', width: '100%' }}>
      <EuiSpacer />

      <EuiText size="s">
        <strong>Tokens</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <FormattedTokens category={category} />

      <EuiSpacer />

      <EuiText size="s">
        <strong>Regex</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <FormattedRegex category={category} />

      <EuiSpacer />

      <EuiText size="s">
        <strong>Examples</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <FormattedPatternExamples category={category} />

      <EuiSpacer />
    </div>
  );
};
