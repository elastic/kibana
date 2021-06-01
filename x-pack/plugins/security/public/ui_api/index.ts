/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';

import type { StartServicesAccessor } from 'src/core/public';

import type { ChangePasswordProps } from '../account_management/change_password';
import type { PersonalInfoProps } from '../account_management/personal_info';
import { UserAPIClient } from '../management';
import type { PluginStartDependencies } from '../plugin';
import { getComponents } from './components';

interface GetUiApiOptions {
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}

type LazyComponentFn<T> = (props: T) => ReactElement;

export interface UiApi {
  components: {
    getPersonalInfo: LazyComponentFn<PersonalInfoProps>;
    getChangePassword: LazyComponentFn<ChangePasswordProps>;
  };
  UserAPIClient: typeof UserAPIClient;
}

export const getUiApi = ({ getStartServices }: GetUiApiOptions): UiApi => {
  const components = getComponents({ getStartServices });

  return {
    components,
    UserAPIClient,
  };
};
