/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiSpacer } from '@elastic/eui';

import { WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { KibanaContext, IKibanaContext } from '../../../index';
import { SideNav, SideNavLink } from '../../../shared/layout';

import {
  ORG_SOURCES_PATH,
  SOURCES_PATH,
  SECURITY_PATH,
  ROLE_MAPPINGS_PATH,
  GROUPS_PATH,
  ORG_SETTINGS_PATH,
} from '../../routes';

export const WorkplaceSearchNav: React.FC = () => {
  const {
    externalUrl: { getWorkplaceSearchUrl },
  } = useContext(KibanaContext) as IKibanaContext;

  // TODO: icons
  return (
    <SideNav product={WORKPLACE_SEARCH_PLUGIN}>
      <SideNavLink to="/" isRoot>
        {i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.overview', {
          defaultMessage: 'Overview',
        })}
      </SideNavLink>
      <SideNavLink isExternal to={getWorkplaceSearchUrl(ORG_SOURCES_PATH)}>
        {i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.sources', {
          defaultMessage: 'Sources',
        })}
      </SideNavLink>
      <SideNavLink isExternal to={getWorkplaceSearchUrl(`#${GROUPS_PATH}`)}>
        {i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.groups', {
          defaultMessage: 'Groups',
        })}
      </SideNavLink>
      <SideNavLink isExternal to={getWorkplaceSearchUrl(`#${ROLE_MAPPINGS_PATH}`)}>
        {i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.roleMappings', {
          defaultMessage: 'Role Mappings',
        })}
      </SideNavLink>
      <SideNavLink isExternal to={getWorkplaceSearchUrl(`#${SECURITY_PATH}`)}>
        {i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.security', {
          defaultMessage: 'Security',
        })}
      </SideNavLink>
      <SideNavLink isExternal to={getWorkplaceSearchUrl(ORG_SETTINGS_PATH)}>
        {i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.settings', {
          defaultMessage: 'Settings',
        })}
      </SideNavLink>
      <EuiSpacer />
      <SideNavLink isExternal to={getWorkplaceSearchUrl(`#${SOURCES_PATH}`)}>
        {i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.personalDashboard', {
          defaultMessage: 'View my personal dashboard',
        })}
      </SideNavLink>
      <SideNavLink isExternal to={getWorkplaceSearchUrl('/search')}>
        {i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.search', {
          defaultMessage: 'Go to search application',
        })}
      </SideNavLink>
    </SideNav>
  );
};
