/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiNotificationBadge } from '@elastic/eui';
import React from 'react';

import type { Capabilities } from '@kbn/core/public';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import type { Role } from '@kbn/security-plugin-types-common';

import { TAB_ID_CONTENT, TAB_ID_FEATURES, TAB_ID_ROLES } from './constants';
import { ViewSpaceContent } from './view_space_content_tab';
import { ViewSpaceEnabledFeatures } from './view_space_enabled_features_tab';
import { ViewSpaceAssignedRoles } from './view_space_roles';
import type { Space } from '../../../common';
import { getEnabledFeatures } from '../lib/feature_utils';

export interface ViewSpaceTab {
  id: string;
  name: string;
  content: JSX.Element;
  append?: JSX.Element;
  href?: string;
}

export interface GetTabsProps {
  space: Space;
  roles: Role[];
  features: KibanaFeature[];
  capabilities: Capabilities & {
    roles?: { view: boolean; save: boolean };
  };
}

export const getTabs = ({
  space,
  features,
  capabilities,
  ...rest
}: GetTabsProps): ViewSpaceTab[] => {
  const enabledFeatureCount = getEnabledFeatures(features, space).length;
  const totalFeatureCount = features.length;

  const canUserViewRoles = Boolean(capabilities?.roles?.view);
  const canUserModifyRoles = Boolean(capabilities?.roles?.save);

  const tabsDefinition = [
    {
      id: TAB_ID_CONTENT,
      name: i18n.translate('xpack.spaces.management.spaceDetails.contentTabs.content.heading', {
        defaultMessage: 'Content',
      }),
      content: <ViewSpaceContent space={space} />,
    },
    {
      id: TAB_ID_FEATURES,
      name: i18n.translate('xpack.spaces.management.spaceDetails.contentTabs.feature.heading', {
        defaultMessage: 'Feature visibility',
      }),
      append: (
        <EuiNotificationBadge className="eui-alignCenter" color="subdued" size="m">
          {enabledFeatureCount} / {totalFeatureCount}
        </EuiNotificationBadge>
      ),
      content: <ViewSpaceEnabledFeatures features={features} space={space} />,
    },
  ];

  if (canUserViewRoles) {
    tabsDefinition.push({
      id: TAB_ID_ROLES,
      name: i18n.translate('xpack.spaces.management.spaceDetails.contentTabs.roles.heading', {
        defaultMessage: 'Assigned roles',
      }),
      append: (
        <EuiNotificationBadge className="eui-alignCenter" color="subdued" size="m">
          {rest.roles.length}
        </EuiNotificationBadge>
      ),
      content: (
        <ViewSpaceAssignedRoles
          space={space}
          spaceRoles={rest.roles}
          features={features}
          isReadOnly={!canUserModifyRoles}
        />
      ),
    });
  }

  return tabsDefinition;
};
