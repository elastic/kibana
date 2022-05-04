/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { compact } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';
import {
  BLOCKLIST,
  ENDPOINTS,
  EVENT_FILTERS,
  EXCEPTIONS,
  TRUSTED_APPLICATIONS,
} from '../../app/translations';
import { SecurityPageName } from '../../app/types';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { LandingLinksIcons, NavItem } from '../components/landing_links_icons';
import { IconBlocklist } from '../icons/blocklist';
import { IconEndpoints } from '../icons/endpoints';
import { IconEndpointPolicies } from '../icons/endpoint_policies';
import { IconEventFilters } from '../icons/event_filters';
import { IconExceptionLists } from '../icons/exception_lists';
import { IconHostIsolation } from '../icons/host_isolation';
import { IconSiemRules } from '../icons/siem_rules';
import { IconTrustedApplications } from '../icons/trusted_applications';
import { MANAGE_PAGE_TITLE } from './translations';

// TODO
const FIX_ME_TEMPORARY_DESCRIPTION = 'Description here';

export interface NavConfigType {
  items: NavItem[];
  categories: Array<{ label: string; itemIds: SecurityPageName[] }>;
}

const config: NavConfigType = {
  categories: [
    {
      label: i18n.translate('xpack.securitySolution.landing.threatHunting.siemTitle', {
        defaultMessage: 'SIEM',
      }),
      itemIds: [SecurityPageName.rules, SecurityPageName.exceptions],
    },
    {
      label: i18n.translate('xpack.securitySolution.landing.threatHunting.endpointsTitle', {
        defaultMessage: 'ENDPOINTS',
      }),
      itemIds: [
        SecurityPageName.endpoints,
        SecurityPageName.policies,
        SecurityPageName.trustedApps,
        SecurityPageName.eventFilters,
        SecurityPageName.blocklist,
        SecurityPageName.hostIsolationExceptions,
      ],
    },
  ],
  items: [
    {
      id: SecurityPageName.rules,
      label: i18n.translate('xpack.securitySolution.landing.manage.rulesLabel', {
        defaultMessage: 'SIEM rules',
      }),
      description: FIX_ME_TEMPORARY_DESCRIPTION,
      icon: IconSiemRules,
    },
    {
      id: SecurityPageName.exceptions,
      label: EXCEPTIONS,
      description: FIX_ME_TEMPORARY_DESCRIPTION,
      icon: IconExceptionLists,
    },
    {
      id: SecurityPageName.endpoints,
      label: ENDPOINTS,
      description: i18n.translate('xpack.securitySolution.landing.manage.endpointsDescription', {
        defaultMessage: 'Hosts running endpoint security',
      }),
      icon: IconEndpoints,
    },
    {
      id: SecurityPageName.policies,
      label: i18n.translate('xpack.securitySolution.landing.manage.endpointPoliceLabel', {
        defaultMessage: 'Endpoint policies',
      }),
      description: FIX_ME_TEMPORARY_DESCRIPTION,
      icon: IconEndpointPolicies,
    },
    {
      id: SecurityPageName.trustedApps,
      label: TRUSTED_APPLICATIONS,
      description: i18n.translate(
        'xpack.securitySolution.landing.manage.trustedApplicationsDescription',
        {
          defaultMessage:
            'Improve performance or alleviate conflicts with other applications running on your hosts',
        }
      ),
      icon: IconTrustedApplications,
    },
    {
      id: SecurityPageName.eventFilters,
      label: EVENT_FILTERS,
      description: i18n.translate('xpack.securitySolution.landing.manage.eventFiltersDescription', {
        defaultMessage: 'Exclude unwanted applications from running on your hosts',
      }),
      icon: IconEventFilters,
    },
    {
      id: SecurityPageName.blocklist,
      label: BLOCKLIST,
      description: FIX_ME_TEMPORARY_DESCRIPTION,
      icon: IconBlocklist,
    },
    {
      id: SecurityPageName.hostIsolationExceptions,
      label: i18n.translate('xpack.securitySolution.landing.manage.hostIsolationLabel', {
        defaultMessage: 'Host isolation IP exceptions',
      }),
      description: i18n.translate(
        'xpack.securitySolution.landing.manage.hostIsolationDescription',
        {
          defaultMessage: 'Allow isolated hosts to communicate with specific IPs',
        }
      ),

      icon: IconHostIsolation,
    },
  ],
};

export const ManageLandingPage = () => (
  <SecuritySolutionPageWrapper>
    <HeaderPage title={MANAGE_PAGE_TITLE} />
    <LandingCategories navConfig={config} />
    <SpyRoute pageName={SecurityPageName.dashboardsLanding} />
  </SecuritySolutionPageWrapper>
);

const StyledEuiHorizontalRule = styled(EuiHorizontalRule)`
  margin-top: ${({ theme }) => theme.eui.paddingSizes.m};
  margin-bottom: ${({ theme }) => theme.eui.paddingSizes.l};
`;

const getNavItembyId = (navConfig: NavConfigType) => (itemId: string) =>
  navConfig.items.find(({ id }: NavItem) => id === itemId);

const navItemsFromIds = (itemIds: SecurityPageName[], navConfig: NavConfigType) =>
  compact(itemIds.map(getNavItembyId(navConfig)));

export const LandingCategories = React.memo(({ navConfig }: { navConfig: NavConfigType }) => {
  return (
    <>
      {navConfig.categories.map(({ label, itemIds }, index) => (
        <div key={label}>
          {index > 0 && (
            <>
              <EuiSpacer key="first" size="xl" />
              <EuiSpacer key="second" size="xl" />
            </>
          )}
          <EuiTitle size="xxxs">
            <h2>{label}</h2>
          </EuiTitle>
          <StyledEuiHorizontalRule />
          <LandingLinksIcons items={navItemsFromIds(itemIds, navConfig)} />
        </div>
      ))}
    </>
  );
});

LandingCategories.displayName = 'LandingCategories';
