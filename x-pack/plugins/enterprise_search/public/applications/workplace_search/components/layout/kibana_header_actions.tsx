/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonEmpty, EuiText } from '@elastic/eui';

import { externalUrl, getWorkplaceSearchUrl } from '../../../shared/enterprise_search_url';
import { EuiButtonEmptyTo } from '../../../shared/react_router_helpers';
import { NAV } from '../../constants';
import { PERSONAL_SOURCES_PATH } from '../../routes';

export const WorkplaceSearchHeaderActions: React.FC = () => {
  if (!externalUrl.enterpriseSearchUrl) return null;

  return (
    <>
      <EuiButtonEmptyTo to={PERSONAL_SOURCES_PATH} iconType="user" style={{ marginRight: 5 }}>
        <EuiText size="s">{NAV.PERSONAL_DASHBOARD}</EuiText>
      </EuiButtonEmptyTo>
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
