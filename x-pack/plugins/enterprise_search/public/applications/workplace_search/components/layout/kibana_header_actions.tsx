/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonEmpty, EuiText } from '@elastic/eui';

import { externalUrl, getWorkplaceSearchUrl } from '../../../shared/enterprise_search_url';

import { NAV } from '../../constants';

export const WorkplaceSearchHeaderActions: React.FC = () => {
  if (!externalUrl.enterpriseSearchUrl) return null;

  return (
    <>
      <EuiButtonEmpty
        href={getWorkplaceSearchUrl('/sources')}
        target="_blank"
        iconType="user"
        style={{ marginRight: 5 }}
      >
        <EuiText size="s">{NAV.PERSONAL_DASHBOARD}</EuiText>
      </EuiButtonEmpty>
      <EuiButtonEmpty
        href={getWorkplaceSearchUrl('/search')}
        target="_blank"
        iconType="search"
        style={{ marginRight: 5 }}
      >
        <EuiText size="s">{NAV.SEARCH}</EuiText>
      </EuiButtonEmpty>
    </>
  );
};
