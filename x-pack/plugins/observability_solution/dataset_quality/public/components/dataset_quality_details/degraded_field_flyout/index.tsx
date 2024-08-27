/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useDegradedFields } from '../../../hooks';
import { overviewDegradedFieldsSectionTitle } from '../../../../common/translations';
import { DegradedFieldInfo } from './field_info';

export const DegradedFieldFlyout = () => {
  const { closeDegradedFieldFlyout, expandedDegradedField } = useDegradedFields();
  const pushedFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'pushedFlyoutTitle',
  });

  return (
    <EuiFlyout
      type="push"
      size="s"
      onClose={closeDegradedFieldFlyout}
      aria-labelledby={pushedFlyoutTitleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiBadge color="warning">{overviewDegradedFieldsSectionTitle}</EuiBadge>
        <EuiSpacer size="s" />
        <EuiTitle size="m">
          <EuiText>
            {expandedDegradedField} <span style={{ fontWeight: 400 }}>field ignored</span>
          </EuiText>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <DegradedFieldInfo />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
