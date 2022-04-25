/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiTitle } from '@elastic/eui';
import { ItemTitleRuleSummaryProps } from '../types';

export function ItemTitleRuleSummary({
  translationKey,
  defaultMessage,
}: ItemTitleRuleSummaryProps) {
  return (
    <EuiTitle size="xs">
      <EuiFlexItem grow={1}>
        {i18n.translate(translationKey, {
          defaultMessage,
        })}
      </EuiFlexItem>
    </EuiTitle>
  );
}
