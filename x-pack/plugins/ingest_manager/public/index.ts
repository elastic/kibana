/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext } from 'src/core/public';
import { IngestManagerPlugin } from './plugin';

export { IngestManagerStart } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new IngestManagerPlugin(initializerContext);
};

export {
  CustomConfigureDatasourceContent,
  CustomConfigureDatasourceProps,
  registerDatasource,
} from './applications/ingest_manager/sections/agent_config/create_datasource_page/components/custom_configure_datasource';

export { NewDatasource } from './applications/ingest_manager/types';
export * from './applications/ingest_manager/types/intra_app_route_state';
