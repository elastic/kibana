/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { getUserDisplayName } from '../../common/model';
import { Breadcrumb } from '../components/breadcrumb';
import { useCurrentUser, useUserProfile } from '../components/use_current_user';
import type { UserProfileProps } from './user_profile';
import { UserProfile } from './user_profile';

export const AccountManagementPage: FunctionComponent = () => {
  const { services } = useKibana<CoreStart>();

  const currentUser = useCurrentUser();
  const userProfile = useUserProfile<Pick<UserProfileProps['data'], 'avatar'>>('avatar');

  if (!currentUser.value || !userProfile.value) {
    return null;
  }

  const displayName = getUserDisplayName(userProfile.value.user);

  return (
    <Breadcrumb text={displayName} href={services.http.basePath.prepend('/security/account')}>
      <UserProfile user={currentUser.value} data={userProfile.value.data} />
    </Breadcrumb>
  );
};
