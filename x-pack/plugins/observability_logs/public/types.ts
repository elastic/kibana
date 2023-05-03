import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

export interface ObservabilityLogsPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityLogsPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
