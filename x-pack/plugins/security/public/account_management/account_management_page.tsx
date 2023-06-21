/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { UserProfileData } from '../../common';
import { canUserHaveProfile } from '../../common/model';
import { useCurrentUser, useUserProfile } from '../components';
import { Breadcrumb } from '../components/breadcrumb';
import { UserProfile } from './user_profile';

export const AccountManagementPage: FunctionComponent = () => {
  const { services } = useKibana<CoreStart>();

  const currentUser = useCurrentUser();
  const userProfile = useUserProfile<UserProfileData>('avatar,userSettings');

  // If we fail to load profile, we treat it as a failure _only_ if user is supposed
  // to have a profile. For example, anonymous and users authenticated via
  // authentication proxies don't have profiles.
  const profileLoadError =
    userProfile.error && currentUser.value && canUserHaveProfile(currentUser.value)
      ? userProfile.error
      : undefined;

  const error = currentUser.error || profileLoadError;
  if (error) {
    return <EuiEmptyPrompt iconType="warning" title={<h2>{error.message}</h2>} />;
  }

  if (!currentUser.value || (canUserHaveProfile(currentUser.value) && !userProfile.value)) {
    return null;
  }

  return (
    <Breadcrumb
      text={i18n.translate('xpack.security.accountManagement.userSettingsBreadcrumbRootLabel', {
        defaultMessage: 'User settings',
      })}
      href={services.http.basePath.prepend('/security/account')}
    >
      <UserProfile user={currentUser.value} data={userProfile.value?.data} />
    </Breadcrumb>
  );
};
