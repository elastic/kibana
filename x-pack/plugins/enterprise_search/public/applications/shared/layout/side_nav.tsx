/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiIcon, EuiTitle, EuiText, EuiLink as EuiLinkExternal } from '@elastic/eui'; // TODO: Remove EuiLinkExternal after full Kibana transition
import { EuiLink } from '../react_router_helpers';

import { KibanaContext, IKibanaContext } from '../../';

import { ENTERPRISE_SEARCH_PLUGIN, APP_SEARCH_PLUGIN } from '../../../../common/constants';

import './side_nav.scss';

/**
 * Side navigation - product & icon + links wrapper
 */

export const SideNav: React.FC = () => {
  const { enterpriseSearchUrl } = useContext(KibanaContext) as IKibanaContext;

  return (
    <nav>
      <div className="enterpriseSearchProduct enterpriseSearchProduct--appSearch">
        <div className="enterpriseSearchProduct__icon">
          <EuiIcon type="logoEnterpriseSearch" />
        </div>
        <div className="enterpriseSearchProduct__title">
          <EuiText size="xs" color="subdued">
            {ENTERPRISE_SEARCH_PLUGIN.NAME}
          </EuiText>
          <EuiTitle size="xs">
            <h3>{APP_SEARCH_PLUGIN.NAME}</h3>
          </EuiTitle>
        </div>
      </div>
      <ul className="enterpriseSearchNavLinks">
        <li>
          <EuiLink className="enterpriseSearchNavLinks__item" to="/engines">
            {i18n.translate('xpack.enterpriseSearch.appSearch.nav.engines', {
              defaultMessage: 'Engines',
            })}
          </EuiLink>
        </li>
        <li>
          <EuiLinkExternal
            className="enterpriseSearchNavLinks__item"
            href={`${enterpriseSearchUrl}/as#/settings/account`}
            target="_blank"
          >
            {i18n.translate('xpack.enterpriseSearch.appSearch.nav.settings', {
              defaultMessage: 'Account Settings',
            })}
          </EuiLinkExternal>
        </li>
        <li>
          <EuiLinkExternal
            className="enterpriseSearchNavLinks__item"
            href={`${enterpriseSearchUrl}/as#/settings/credentials`}
            target="_blank"
          >
            {i18n.translate('xpack.enterpriseSearch.appSearch.nav.credentials', {
              defaultMessage: 'Credentials',
            })}
          </EuiLinkExternal>
        </li>
        <li>
          <EuiLinkExternal
            className="enterpriseSearchNavLinks__item"
            href={`${enterpriseSearchUrl}/as#/settings/role-mappings`}
            target="_blank"
          >
            {i18n.translate('xpack.enterpriseSearch.appSearch.nav.roleMappings', {
              defaultMessage: 'Role Mappings',
            })}
          </EuiLinkExternal>
        </li>
      </ul>
    </nav>
  );
};
