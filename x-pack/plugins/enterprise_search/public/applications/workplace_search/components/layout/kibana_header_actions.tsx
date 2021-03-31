/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonEmpty, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { externalUrl, getWorkplaceSearchUrl } from '../../../shared/enterprise_search_url';
import { NAV } from '../../constants';

export const WorkplaceSearchHeaderActions: React.FC = () => {
  if (!externalUrl.enterpriseSearchUrl) return null;

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiButtonEmpty href={getWorkplaceSearchUrl('/sources')} target="_blank" iconType="user">
          <EuiText size="s">{NAV.PERSONAL_DASHBOARD}</EuiText>
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonEmpty href={getWorkplaceSearchUrl('/search')} target="_blank" iconType="search">
          <EuiText size="s">{NAV.SEARCH}</EuiText>
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
