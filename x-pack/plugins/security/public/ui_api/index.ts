/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';

import type { CoreStart } from 'src/core/public';

import type { ChangePasswordProps } from './change_password';
import { getComponents } from './components';
import type { PersonalInfoProps } from './personal_info';

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
}

export const getUiApi = ({ core }: GetUiApiOptions): UiApi => {
  const components = getComponents({ core });

  return {
    components,
  };
};
