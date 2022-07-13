import { IRouter } from '@kbn/core/server';
import { Plugin } from '..';

import { registerRoute as registerRoute_GET_cpu_profile } from './GET_cpu_profile';
import { registerRoute as registerRoute_GET_heap_snapshot } from './GET_heap_snapshot';

export function registerRoutes(plugin: Plugin, router: IRouter): void {
  registerRoute_GET_cpu_profile(plugin, router);
  registerRoute_GET_heap_snapshot(plugin, router);
}
