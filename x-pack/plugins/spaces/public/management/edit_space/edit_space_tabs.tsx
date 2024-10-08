/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiNotificationBadge } from '@elastic/eui';
import React from 'react';

import type { Capabilities, ScopedHistory } from '@kbn/core/public';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import { withSuspense } from '@kbn/shared-ux-utility';

import { TAB_ID_CONTENT, TAB_ID_GENERAL, TAB_ID_ROLES } from './constants';
import type { Space } from '../../../common';

export interface EditSpaceTab {
  id: string;
  name: string;
  content: JSX.Element;
  append?: JSX.Element;
  href?: string;
}

export interface GetTabsProps {
  space: Space;
  rolesCount: number;
  features: KibanaFeature[];
  history: ScopedHistory;
  capabilities: Capabilities & {
    roles?: { view: boolean; save: boolean };
  };
  allowFeatureVisibility: boolean;
  allowSolutionVisibility: boolean;
}

const SuspenseEditSpaceSettingsTab = withSuspense(
  React.lazy(() =>
    import('./edit_space_general_tab').then(({ EditSpaceSettingsTab }) => ({
      default: EditSpaceSettingsTab,
    }))
  )
);

const SuspenseEditSpaceAssignedRolesTab = withSuspense(
  React.lazy(() =>
    import('./edit_space_roles_tab').then(({ EditSpaceAssignedRolesTab }) => ({
      default: EditSpaceAssignedRolesTab,
    }))
  )
);

const SuspenseEditSpaceContentTab = withSuspense(
  React.lazy(() =>
    import('./edit_space_content_tab').then(({ EditSpaceContentTab }) => ({
      default: EditSpaceContentTab,
    }))
  )
);

export const getTabs = ({
  space,
  features,
  history,
  capabilities,
  rolesCount,
  ...props
}: GetTabsProps): EditSpaceTab[] => {
  const canUserViewRoles = Boolean(capabilities?.roles?.view);
  const canUserModifyRoles = Boolean(capabilities?.roles?.save);
  const reloadWindow = () => {
    window.location.reload();
  };

  const tabsDefinition: EditSpaceTab[] = [
    {
      id: TAB_ID_GENERAL,
      name: i18n.translate('xpack.spaces.management.spaceDetails.contentTabs.general.heading', {
        defaultMessage: 'General settings',
      }),
      content: (
        <SuspenseEditSpaceSettingsTab
          space={space}
          features={features}
          history={history}
          reloadWindow={reloadWindow}
          {...props}
        />
      ),
    },
  ];

  if (canUserViewRoles) {
    tabsDefinition.push({
      id: TAB_ID_ROLES,
      name: i18n.translate('xpack.spaces.management.spaceDetails.contentTabs.roles.heading', {
        defaultMessage: 'Permissions',
      }),
      append: (
        <EuiNotificationBadge className="eui-alignCenter" color="subdued" size="m">
          {rolesCount}
        </EuiNotificationBadge>
      ),
      content: (
        <SuspenseEditSpaceAssignedRolesTab
          space={space}
          features={features}
          isReadOnly={!canUserModifyRoles}
        />
      ),
    });
  }

  tabsDefinition.push({
    id: TAB_ID_CONTENT,
    name: i18n.translate('xpack.spaces.management.spaceDetails.contentTabs.content.heading', {
      defaultMessage: 'Content',
    }),
    content: <SuspenseEditSpaceContentTab space={space} />,
  });

  return tabsDefinition;
};
