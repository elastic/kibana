import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

export interface RacPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RacPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
