import './index.scss';

import { ObservabilityLogsPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new ObservabilityLogsPlugin();
}
export type { ObservabilityLogsPluginSetup, ObservabilityLogsPluginStart } from './types';
