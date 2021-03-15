import './index.scss';

import { RacPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new RacPlugin();
}
export { RacPluginSetup, RacPluginStart } from './types';
