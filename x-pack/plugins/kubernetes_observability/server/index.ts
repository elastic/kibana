import { PluginInitializerContext } from '../../../../src/core/server';
import { KubernetesObservabilityPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new KubernetesObservabilityPlugin(initializerContext);
}

export { KubernetesObservabilityPluginSetup, KubernetesObservabilityPluginStart } from './types';
