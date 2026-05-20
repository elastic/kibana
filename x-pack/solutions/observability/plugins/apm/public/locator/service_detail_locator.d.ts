import type { IUiSettingsClient } from '@kbn/core/public';
import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { APMLocatorPayload } from './helpers';
export declare const APM_APP_LOCATOR_ID = "APM_LOCATOR";
export declare class APMServiceDetailLocator implements LocatorDefinition<APMLocatorPayload> {
    id: string;
    uiSettings: IUiSettingsClient;
    constructor(uiSettings: IUiSettingsClient);
    getLocation(payload: APMLocatorPayload): Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
