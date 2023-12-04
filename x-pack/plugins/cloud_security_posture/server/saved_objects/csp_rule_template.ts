import { CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '@kbn/cloud-security-posture-plugin/common/constants';
import {
  cspRuleTemplateSchemaV830,
  cspRuleTemplateSchemaV840,
  cspRuleTemplateSchemaV870,
} from '@kbn/cloud-security-posture-plugin/common/schemas';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { SavedObjectsType } from 'src/core/server';
import { cspRuleTemplateMigrations } from './migrations';
import { cspRuleTemplateSavedObjectMapping } from './mappings';

export const cspRuleTemplate: SavedObjectsType = {
  name: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'agnostic',
  management: {
    importableAndExportable: true,
    visibleInManagement: true,
  },
  schemas: {
    '8.3.0': cspRuleTemplateSchemaV830,
    '8.4.0': cspRuleTemplateSchemaV840,
    '8.7.0': cspRuleTemplateSchemaV870,
  },
  migrations: cspRuleTemplateMigrations,
  mappings: cspRuleTemplateSavedObjectMapping,
};
