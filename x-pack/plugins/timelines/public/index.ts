import './index.scss';

import { PluginInitializerContext } from 'src/core/public';
import { TimelinesPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin(initializerContext: PluginInitializerContext) {
  return new TimelinesPlugin(initializerContext);
}
export { TimelinesPluginSetup } from './types';
