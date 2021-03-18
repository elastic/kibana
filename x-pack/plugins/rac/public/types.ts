import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

export interface RacPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RacPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}

/**
 * Id for the lifecycle rule alerting type
 */
export const LIFECYCLE_RULE_ALERT_TYPE_ID = 'rac.lifecycle';

// export interface SubPlugins {
//   rules: Rules;
//   cases: Cases;
//   alerts: Alerts;
// }
