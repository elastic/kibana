/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import classNames from 'classnames';

import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiTitle, EuiText, EuiLink as EuiLinkExternal } from '@elastic/eui'; // TODO: Remove EuiLinkExternal after full Kibana transition
import { EuiLink } from '../react_router_helpers';

import { ENTERPRISE_SEARCH_PLUGIN } from '../../../../common/constants';
import { stripTrailingSlash } from '../../../../common/strip_slashes';

import { NavContext, INavContext } from './layout';

import './side_nav.scss';

/**
 * Side navigation - product & icon + links wrapper
 */

interface SideNavProps {
  // Expects product plugin constants (@see common/constants.ts)
  product: {
    NAME: string;
    ID: string;
  };
}

export const SideNav: React.FC<SideNavProps> = ({ product, children }) => {
  return (
    <nav
      id="enterpriseSearchNav"
      aria-label={i18n.translate('xpack.enterpriseSearch.nav.hierarchy', {
        defaultMessage: 'Secondary', // The main Kibana nav is primary
      })}
    >
      <div className={`enterpriseSearchProduct enterpriseSearchProduct--${product.ID}`}>
        <div className="enterpriseSearchProduct__icon">
          <EuiIcon type="logoEnterpriseSearch" />
        </div>
        <div className="enterpriseSearchProduct__title">
          <EuiText size="xs" color="subdued">
            {ENTERPRISE_SEARCH_PLUGIN.NAME}
          </EuiText>
          <EuiTitle size="xs">
            <h3>{product.NAME}</h3>
          </EuiTitle>
        </div>
      </div>
      <ul className="enterpriseSearchNavLinks">{children}</ul>
    </nav>
  );
};

/**
 * Side navigation link item
 */

interface SideNavLinkProps {
  to: string;
  shouldShowActiveForSubroutes?: boolean;
  isExternal?: boolean;
  className?: string;
  isRoot?: boolean;
  subNav?: React.ReactNode;
}

export const SideNavLink: React.FC<SideNavLinkProps> = ({
  to,
  shouldShowActiveForSubroutes = false,
  isExternal,
  children,
  className,
  isRoot,
  subNav,
  ...rest
}) => {
  const { closeNavigation } = useContext(NavContext) as INavContext;

  const { pathname } = useLocation();
  const currentPath = stripTrailingSlash(pathname);
  const isActive =
    currentPath === to ||
    (shouldShowActiveForSubroutes && currentPath.startsWith(to)) ||
    (isRoot && currentPath === '');

  const classes = classNames('enterpriseSearchNavLinks__item', className, {
    'enterpriseSearchNavLinks__item--isActive': !isExternal && isActive, // eslint-disable-line @typescript-eslint/naming-convention
  });

  return (
    <li>
      {isExternal ? (
        <EuiLinkExternal
          {...rest}
          className={classes}
          href={to}
          target="_blank"
          onClick={closeNavigation}
        >
          {children}
        </EuiLinkExternal>
      ) : (
        <EuiLink {...rest} className={classes} to={to} onClick={closeNavigation}>
          {children}
        </EuiLink>
      )}
      {subNav && <ul className="enterpriseSearchNavLinks__subNav">{subNav}</ul>}
    </li>
  );
};

/**
 * Side navigation non-link item
 */

interface SideNavItemProps {
  className?: string;
}

export const SideNavItem: React.FC<SideNavItemProps> = ({ children, className, ...rest }) => {
  const classes = classNames('enterpriseSearchNavLinks__item', className);
  return (
    <li {...rest} className={classes}>
      {children}
    </li>
  );
};
