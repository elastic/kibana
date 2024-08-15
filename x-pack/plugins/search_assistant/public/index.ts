import './index.scss';

import { SearchAssistantPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new SearchAssistantPlugin();
}
export type { SearchAssistantPluginSetup, SearchAssistantPluginStart } from './types';
