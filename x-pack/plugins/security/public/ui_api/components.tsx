/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren, PropsWithRef } from 'react';
import React from 'react';

import type { CoreStart } from '@kbn/core/public';

/**
 * We're importing specific files here instead of passing them
 * through the index file. It helps to keep the bundle size low.
 *
 * Importing async components through the index file increases the bundle size.
 * It happens because the bundle starts to also include all the sync dependencies
 * available through the index file.
 */
import { getChangePasswordComponent } from './change_password/change_password_async';
import { LazyWrapper } from './lazy_wrapper';
import { getPersonalInfoComponent } from './personal_info/personal_info_async';

export interface GetComponentsOptions {
  core: CoreStart;
}

export const getComponents = ({ core }: GetComponentsOptions) => {
  /**
   * Returns a function that creates a lazy-loading version of a component.
   */
  function wrapLazy<T>(fn: () => Promise<FC<T>>) {
    return (props: JSX.IntrinsicAttributes & PropsWithRef<PropsWithChildren<T>>) => (
      <LazyWrapper fn={fn} core={core} props={props} />
    );
  }

  return {
    getPersonalInfo: wrapLazy(getPersonalInfoComponent),
    getChangePassword: wrapLazy(() => getChangePasswordComponent(core)),
  };
};
