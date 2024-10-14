/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { externalUrl, getWorkplaceSearchUrl } from '../../../shared/enterprise_search_url';
import { EndpointsHeaderAction } from '../../../shared/layout/endpoints_header_action';
import { EuiButtonEmptyTo } from '../../../shared/react_router_helpers';
import { AppLogic } from '../../app_logic';
import { NAV } from '../../constants';
import { PRIVATE_SOURCES_PATH } from '../../routes';

export const WorkplaceSearchHeaderActions: React.FC = () => {
  const {
    organization: { kibanaUIsEnabled },
  } = useValues(AppLogic);

  if (!externalUrl.enterpriseSearchUrl) return null;

  if (!kibanaUIsEnabled) {
    // we can't just return a null here as it will not render
    // the Endpoints and Keys flyout button
    return (
      <EndpointsHeaderAction>
        <></>
      </EndpointsHeaderAction>
    );
  }

  return (
    <EndpointsHeaderAction>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiButtonEmptyTo
            data-test-subj="PersonalDashboardButton"
            iconType="user"
            to={PRIVATE_SOURCES_PATH}
            size="s"
          >
            {NAV.PERSONAL_DASHBOARD}
          </EuiButtonEmptyTo>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty
            data-test-subj="HeaderSearchButton"
            href={getWorkplaceSearchUrl('/search')}
            target="_blank"
            iconType="search"
            size="s"
          >
            {NAV.SEARCH}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EndpointsHeaderAction>
  );
};
