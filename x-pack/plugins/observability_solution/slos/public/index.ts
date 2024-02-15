import './index.scss';

import { SlosPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new SlosPlugin();
}
export type { SlosPluginSetup, SlosPluginStart } from './types';
