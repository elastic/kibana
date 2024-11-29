import './index.scss';

import { AssetInventoryPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new AssetInventoryPlugin();
}
export type { AssetInventoryPluginSetup, AssetInventoryPluginStart } from './types';
