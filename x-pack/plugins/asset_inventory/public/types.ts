import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

export interface AssetInventoryPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AssetInventoryPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
