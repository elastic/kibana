import type { SavedObjectsClient } from '@kbn/core/server';
import { type CoreStart } from '@kbn/core/server';
export declare function getInternalSavedObjectsClient(coreStart: CoreStart): Promise<SavedObjectsClient>;
export declare function getInternalSavedObjectsClientForSpaceId(coreStart: CoreStart, spaceId?: string): import("@kbn/core/server").SavedObjectsClientContract;
