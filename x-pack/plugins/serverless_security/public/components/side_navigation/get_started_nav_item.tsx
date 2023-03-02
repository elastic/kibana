/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import { EuiLink, EuiListGroupItem, EuiHorizontalRule } from '@elastic/eui';
import type { NavigationLink } from '@kbn/security-solution-plugin/public/common/links';
import type { CustomSideNavItem } from '@kbn/shared-ux-side-navigation';
import { useLinkProps } from '../../hooks/use_link_props';

/**
 * Renders the navigation item for "Get Started" custom link
 */
const GetStartedCustomLinkComponent: React.FC<{
  isSelected: boolean;
  title: string;
}> = ({ isSelected, title }) => {
  const linkProps = useLinkProps({ deepLinkId: SecurityPageName.landing });
  return (
    <EuiLink color={isSelected ? 'primary' : 'text'} {...linkProps}>
      <EuiListGroupItem
        label={title.toUpperCase()}
        size="xs"
        color={isSelected ? 'primary' : 'text'}
        iconType="launch"
        iconProps={{
          color: isSelected ? 'primary' : 'text',
        }}
      />
      <EuiHorizontalRule margin="xs" />
    </EuiLink>
  );
};
export const GetStartedCustomLink = React.memo(GetStartedCustomLinkComponent);

export const formatGetStartedItem = (navItem: NavigationLink): CustomSideNavItem => ({
  id: navItem.id,
  render: (isSelected: boolean) => (
    <GetStartedCustomLink isSelected={isSelected} title={navItem.title} />
  ),
});
