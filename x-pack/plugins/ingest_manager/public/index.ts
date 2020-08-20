/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext } from 'src/core/public';
import { IngestManagerPlugin } from './plugin';

export { IngestManagerSetup, IngestManagerStart } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new IngestManagerPlugin(initializerContext);
};

export {
  CustomConfigurePackagePolicyContent,
  CustomConfigurePackagePolicyProps,
  registerPackagePolicyComponent,
} from './applications/ingest_manager/sections/agent_policy/create_package_policy_page/components/custom_package_policy';

export { NewPackagePolicy } from './applications/ingest_manager/types';
export * from './applications/ingest_manager/types/intra_app_route_state';
