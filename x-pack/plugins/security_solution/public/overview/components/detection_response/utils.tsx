/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';

import * as i18n from './translations';

export const SEVERITY_COLOR = {
  critical: '#E7664C',
  high: '#DA8B45',
  medium: '#D6BF57',
  low: '#54B399',
} as const;

export const ITEMS_PER_PAGE = 4;
const MAX_ALLOWED_RESULTS = 100;

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

/**
 * While there could be more than 100 hosts or users we only want to show 25 pages of results,
 * and the host count cardinality result will always be the total count
 * */
export const getPageCount = (count: number = 0) =>
  Math.ceil(Math.min(count || 0, MAX_ALLOWED_RESULTS) / ITEMS_PER_PAGE);
