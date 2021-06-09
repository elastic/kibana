import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

export interface EcsMapperPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EcsMapperPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
