/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LazyExoticComponent, ReactElement } from 'react';
import { lazy } from 'react';

import type { CoreStart } from '@kbn/core/public';

import type { ChangePasswordProps } from './change_password';
import { getComponents } from './components';
import type { PersonalInfoProps } from './personal_info';
import type { UserProfilesSelectable } from './user_profiles_selectable/user_profiles_selectable';

export type { ChangePasswordProps, PersonalInfoProps };

interface GetUiApiOptions {
  core: CoreStart;
}

type LazyComponentFn<T> = (props: T) => ReactElement;

export interface UiApi {
  components: {
    getPersonalInfo: LazyComponentFn<PersonalInfoProps>;
    getChangePassword: LazyComponentFn<ChangePasswordProps>;
  };
  UserProfilesSelectable: LazyExoticComponent<typeof UserProfilesSelectable>;
}

export const getUiApi = ({ core }: GetUiApiOptions): UiApi => {
  const components = getComponents({ core });

  return {
    components,
    UserProfilesSelectable: lazy(() => import('./user_profiles_selectable')),
  };
};
