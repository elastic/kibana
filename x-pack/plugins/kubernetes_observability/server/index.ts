import { PluginInitializerContext } from '@kbn/core/server';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { KubernetesObservabilityPlugin } = await import('./plugin');
  return new KubernetesObservabilityPlugin(initializerContext);
}

export type {
  KubernetesObservabilityPluginSetup,
  KubernetesObservabilityPluginStart,
} from './types';
