import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BarPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BarPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
