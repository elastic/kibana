/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedRelative } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from './translations';

export const SEVERITY_COLOR = {
  critical: '#E7664C',
  high: '#DA8B45',
  medium: '#D6BF57',
  low: '#54B399',
} as const;

export interface LastUpdatedAtProps {
  updatedAt: number;
  isUpdating: boolean;
}
export const LastUpdatedAt: React.FC<LastUpdatedAtProps> = ({ isUpdating, updatedAt }) => (
  <EuiFlexGroup>
    {isUpdating ? (
      <EuiFlexItem grow={false}>{i18n.UPDATING}</EuiFlexItem>
    ) : (
      <EuiFlexItem grow={false}>
        <>{i18n.UPDATED} </>
        <FormattedRelative
          data-test-subj="last-updated-at-date"
          key={`formattedRelative-${Date.now()}`}
          value={new Date(updatedAt)}
        />
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
