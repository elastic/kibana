/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import classNames from 'classnames';

import { EuiIcon, EuiTitle, EuiText, EuiLink as EuiLinkExternal } from '@elastic/eui'; // TODO: Remove EuiLinkExternal after full Kibana transition
import { EuiLink } from '../react_router_helpers';

import { ENTERPRISE_SEARCH_PLUGIN } from '../../../../common/constants';

import './side_nav.scss';

/**
 * Side navigation - product & icon + links wrapper
 */

interface ISideNavProps {
  // Expects product plugin constants (@see common/constants.ts)
  product: {
    NAME: string;
    ID: string;
  };
}

export const SideNav: React.FC<ISideNavProps> = ({ product, children }) => {
  return (
    <nav>
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

interface ISideNavLinkProps {
  to: string;
  isExternal?: boolean;
  className?: string;
}

export const SideNavLink: React.FC<ISideNavLinkProps> = ({
  isExternal,
  to,
  children,
  className,
  ...rest
}) => {
  const classes = classNames('enterpriseSearchNavLinks__item', className);

  return (
    <li>
      {isExternal ? (
        <EuiLinkExternal {...rest} className={classes} href={to} target="_blank">
          {children}
        </EuiLinkExternal>
      ) : (
        <EuiLink {...rest} className={classes} to={to}>
          {children}
        </EuiLink>
      )}
    </li>
  );
};
