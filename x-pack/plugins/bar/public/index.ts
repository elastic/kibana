import './index.scss';

import { BarPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new BarPlugin();
}
export { BarPluginSetup, BarPluginStart } from './types';
