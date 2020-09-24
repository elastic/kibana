/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from '../../../../src/core/public';
import { LensPluginStartDependencies } from './plugin';
import { AttributeService } from '../../../../src/plugins/dashboard/public';
import {
  LensSavedObjectAttributes,
  LensByValueInput,
  LensByReferenceInput,
} from './editor_frame_service/embeddable/embeddable';
import { SavedObjectIndexStore, DOC_TYPE } from './persistence';

export type LensAttributeService = AttributeService<
  LensSavedObjectAttributes,
  LensByValueInput,
  LensByReferenceInput
>;

export function getLensAttributeService(
  core: CoreStart,
  startDependencies: LensPluginStartDependencies
): LensAttributeService {
  const savedObjectStore = new SavedObjectIndexStore(core.savedObjects.client);
  return startDependencies.dashboard.getAttributeService<
    LensSavedObjectAttributes,
    LensByValueInput,
    LensByReferenceInput
  >(DOC_TYPE, {
    customSaveMethod: async (
      type: string,
      attributes: LensSavedObjectAttributes,
      savedObjectId?: string
    ) => {
      const savedDoc = await savedObjectStore.save({
        ...attributes,
        savedObjectId,
        type: DOC_TYPE,
      });
      return { id: savedDoc.savedObjectId };
    },
    customUnwrapMethod: (savedObject) => {
      return {
        ...savedObject.attributes,
        references: savedObject.references,
      };
    },
  });
}
