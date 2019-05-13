/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentClass, FunctionComponent } from 'react';
import { createShim } from '../../../public/shim';
import { setAppDependencies } from '../../../public/app/index';

const { core, plugins } = createShim();
const appDependencies = {
  core,
  plugins,
};

type ComponentType = ComponentClass<any> | FunctionComponent<any>;

export const WithProviders = (Comp: ComponentType) => {
  const AppDependenciesProvider = setAppDependencies(appDependencies);

  return (props: any) => {
    return (
      <AppDependenciesProvider value={appDependencies}>
        <Comp {...props} />
      </AppDependenciesProvider>
    );
  };
};
