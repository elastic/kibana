/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { lazy } from 'react';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  CloudDefendPluginSetup,
  CloudDefendPluginStart,
  CloudDefendPluginStartDeps,
} from './types';
import { INTEGRATION_PACKAGE_NAME } from '../common/constants';

const LazyEditPolicy = lazy(() => import('./components/fleet_extensions/policy_extension_edit'));
const LazyCreatePolicy = lazy(
  () => import('./components/fleet_extensions/policy_extension_create')
);

export class CloudDefendPlugin implements Plugin<CloudDefendPluginSetup, CloudDefendPluginStart> {
  public setup(core: CoreSetup): CloudDefendPluginSetup {
    // Return methods that should be available to other plugins
    return {};
  }

  public start(core: CoreStart, plugins: CloudDefendPluginStartDeps): CloudDefendPluginStart {
    plugins.fleet.registerExtension({
      package: INTEGRATION_PACKAGE_NAME,
      view: 'package-policy-create',
      Component: LazyCreatePolicy,
    });

    plugins.fleet.registerExtension({
      package: INTEGRATION_PACKAGE_NAME,
      view: 'package-policy-edit',
      Component: LazyEditPolicy,
    });

    return {};
  }

  public stop() {}
}
