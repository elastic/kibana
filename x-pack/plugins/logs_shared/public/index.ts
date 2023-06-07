import './index.scss';

import { LogsSharedPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new LogsSharedPlugin();
}
export type { LogsSharedPluginSetup, LogsSharedPluginStart } from './types';
