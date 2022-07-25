/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { CoreStart } from '@kbn/core/public';
import { CanvasServices } from './services';
import { CanvasSetup, CanvasStart, CanvasStartDeps, CanvasPlugin } from './plugin';

export type { CanvasSetup, CanvasStart };

export interface WithKibanaProps {
  kibana: {
    services: CoreStart & CanvasStartDeps & { canvas: CanvasServices };
  };
}

export const plugin = (initializerContext: PluginInitializerContext) =>
  new CanvasPlugin(initializerContext);
