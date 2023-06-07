import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

export interface LogsSharedPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogsSharedPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
