/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateLogsExplorerController } from '@kbn/logs-explorer-plugin/public';
import { PluginKibanaContextValue } from '../utils/use_kibana';
import { createOnUknownDataViewSelectionHandler } from './discover_navigation_handler';

export const createLogsExplorerControllerWithCustomizations =
  (
    createLogsExplorerController: CreateLogsExplorerController,
    services: PluginKibanaContextValue
  ): CreateLogsExplorerController =>
  (args) =>
    createLogsExplorerController({
      ...args,
      customizations: {
        ...args.customizations,
        events: {
          onUknownDataViewSelection: createOnUknownDataViewSelectionHandler(services.discover),
        },
      },
    });
