/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren, PropsWithRef } from 'react';
import React from 'react';

import type { StartServicesAccessor } from 'src/core/public';

import { getChangePasswordComponent } from '../account_management/change_password';
import { getPersonalInfoComponent } from '../account_management/personal_info';
import type { PluginStartDependencies } from '../plugin';
import { LazyWrapper } from './lazy_wrapper';

export interface GetComponentsOptions {
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}

export const getComponents = ({ getStartServices }: GetComponentsOptions) => {
  /**
   * Returns a function that creates a lazy-loading version of a component.
   */
  function wrapLazy<T>(fn: () => Promise<FC<T>>) {
    return (props: JSX.IntrinsicAttributes & PropsWithRef<PropsWithChildren<T>>) => (
      <LazyWrapper fn={fn} getStartServices={getStartServices} props={props} />
    );
  }

  return {
    getPersonalInfo: wrapLazy(getPersonalInfoComponent),
    getChangePassword: wrapLazy(getChangePasswordComponent),
  };
};
