/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  KibanaPageTemplate,
  KibanaPageTemplateProps,
} from '../../../../../src/plugins/kibana_react/public';
import { navigationLinks } from '../application/navigation';

const activeItemStyle = { fontWeight: 700 };

const navItems: NonNullable<KibanaPageTemplateProps['solutionNav']>['items'] = navigationLinks.map(
  (route) => ({
    id: route.name,
    ...route,
    renderItem: () => (
      <NavLink to={route.path as string} activeStyle={activeItemStyle}>
        {route.name}
      </NavLink>
    ),
  })
);

const defaultProps: KibanaPageTemplateProps = {
  solutionNav: {
    name: 'Cloud Security Posture',
    items: navItems,
  },
  restrictWidth: false,
  template: 'default',
};

export const CspPageTemplate: React.FC<KibanaPageTemplateProps> = ({ children, ...props }) => {
  return (
    <KibanaPageTemplate {...defaultProps} {...props}>
      {children}
    </KibanaPageTemplate>
  );
};
