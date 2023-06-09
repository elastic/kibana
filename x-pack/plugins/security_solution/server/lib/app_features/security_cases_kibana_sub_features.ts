/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import {
  createUICapabilities as createCasesUICapabilities,
  getApiTags as getCasesApiTags,
} from '@kbn/cases-plugin/common';
import { APP_ID } from '../../../common/constants';

const casesCapabilities = createCasesUICapabilities();
const casesApiTags = getCasesApiTags(APP_ID);

const deleteCasesSubFeature: SubFeatureConfig = {
  name: i18n.translate('xpack.securitySolution.featureRegistry.deleteSubFeatureName', {
    defaultMessage: 'Delete',
  }),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          api: casesApiTags.delete,
          id: 'cases_delete',
          name: i18n.translate('xpack.securitySolution.featureRegistry.deleteSubFeatureDetails', {
            defaultMessage: 'Delete cases and comments',
          }),
          includeIn: 'all',
          savedObject: {
            all: [...filesSavedObjectTypes],
            read: [...filesSavedObjectTypes],
          },
          cases: {
            delete: [APP_ID],
          },
          ui: casesCapabilities.delete,
        },
      ],
    },
  ],
};

export enum CasesSubFeatureId {
  deleteCases = 'deleteCasesSubFeature',
}

// Defines all the ordered Security Cases subFeatures available
export const casesSubFeaturesMap = Object.freeze(
  new Map<CasesSubFeatureId, SubFeatureConfig>([
    [CasesSubFeatureId.deleteCases, deleteCasesSubFeature],
  ])
);
