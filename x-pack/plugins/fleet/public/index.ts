/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110901
/* eslint-disable @kbn/eslint/no_export_all */

import type { PluginInitializerContext } from '@kbn/core/public';

import { FleetPlugin } from './plugin';

export type { FleetSetup, FleetStart } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new FleetPlugin(initializerContext);
};

export type { NewPackagePolicy } from './types';
export * from './types/intra_app_route_state';
export * from './types/ui_extensions';

export { pagePathGetters } from './constants';
export { pkgKeyFromPackageInfo } from './services';
export type { CustomAssetsAccordionProps } from './components/custom_assets_accordion';
export { CustomAssetsAccordion } from './components/custom_assets_accordion';
// Export Package editor components for custom editors
export { PackagePolicyEditorDatastreamPipelines } from './applications/fleet/sections/agent_policy/create_package_policy_page/components/datastream_pipelines';
export type { PackagePolicyEditorDatastreamPipelinesProps } from './applications/fleet/sections/agent_policy/create_package_policy_page/components/datastream_pipelines';
export { PackagePolicyEditorDatastreamMappings } from './applications/fleet/sections/agent_policy/create_package_policy_page/components/datastream_mappings';
export type { PackagePolicyEditorDatastreamMappingsProps } from './applications/fleet/sections/agent_policy/create_package_policy_page/components/datastream_mappings';
