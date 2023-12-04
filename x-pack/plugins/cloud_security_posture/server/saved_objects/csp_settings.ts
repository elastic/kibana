import { SavedObjectsType } from 'src/core/server';

import { INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE } from '@kbn/cloud-security-posture-plugin/common/constants';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { cspSettingsSchema } from '@kbn/cloud-security-posture-plugin/common/schemas/csp_settings';
import { cspSettingsSavedObjectMapping } from './mappings';

export const cspSettings: SavedObjectsType = {
  name: INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'agnostic',
  management: {
    importableAndExportable: true,
    visibleInManagement: true,
  },
  schemas: {
    '8.12.0': cspSettingsSchema,
  },
  mappings: cspSettingsSavedObjectMapping,
};
