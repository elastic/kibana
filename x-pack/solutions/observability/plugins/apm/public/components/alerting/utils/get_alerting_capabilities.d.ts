import type { Capabilities } from '@kbn/core/public';
import type { ApmPluginSetupDeps } from '../../../plugin';
export declare const getAlertingCapabilities: (plugins: ApmPluginSetupDeps, capabilities: Capabilities) => {
    isAlertingAvailable: boolean;
    canReadAlerts: boolean;
    canSaveAlerts: boolean;
};
