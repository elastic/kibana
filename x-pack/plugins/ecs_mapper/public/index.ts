import './index.scss';

import { EcsMapperPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new EcsMapperPlugin();
}
export { EcsMapperPluginSetup, EcsMapperPluginStart } from './types';
