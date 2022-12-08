import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

export interface KubernetesObservabilityPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface KubernetesObservabilityPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
