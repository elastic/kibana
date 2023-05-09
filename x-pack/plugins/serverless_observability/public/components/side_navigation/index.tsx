/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { CoreStart } from '@kbn/core/public';
import type {
  SideNavComponent,
  SideNavCompProps,
} from '@kbn/core-chrome-browser/src/project_navigation';
import { ServerlessObservabilityPluginStartDependencies } from '../../types';
import { ObservabilitySideNavigation } from './side_navigation';
import { KibanaServicesProvider } from '../../services';

export const getObservabilitySideNavComponent = (
  core: CoreStart,
  pluginsStart: ServerlessObservabilityPluginStartDependencies
): SideNavComponent => {
  return (_props: SideNavCompProps) => (
    <KibanaServicesProvider core={core} pluginsStart={pluginsStart}>
      <ObservabilitySideNavigation />
    </KibanaServicesProvider>
  );
};
