/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  createUICapabilities as createCasesUICapabilities,
  getApiTags as getCasesApiTags,
} from '@kbn/cases-plugin/common';
import type { AppFeaturesCasesConfig } from './types';
import { APP_ID, CASES_FEATURE_ID } from '../../../common/constants';
import { casesSubFeatureDelete } from './security_cases_kibana_sub_features';
import { AppFeatureCasesKey } from '../../../common/types/app_features';

const casesCapabilities = createCasesUICapabilities();
const casesApiTags = getCasesApiTags(APP_ID);

export const getCasesBaseKibanaFeature = (): KibanaFeatureConfig => ({
  id: CASES_FEATURE_ID,
  name: i18n.translate('xpack.securitySolution.featureRegistry.linkSecuritySolutionCaseTitle', {
    defaultMessage: 'Cases',
  }),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.security,
  app: [CASES_FEATURE_ID, 'kibana'],
  catalogue: [APP_ID],
  cases: [APP_ID],
  privileges: {
    all: {
      api: casesApiTags.all,
      app: [CASES_FEATURE_ID, 'kibana'],
      catalogue: [APP_ID],
      cases: {
        create: [APP_ID],
        read: [APP_ID],
        update: [APP_ID],
        push: [APP_ID],
      },
      savedObject: {
        all: [...filesSavedObjectTypes],
        read: [...filesSavedObjectTypes],
      },
      ui: casesCapabilities.all,
    },
    read: {
      api: casesApiTags.read,
      app: [CASES_FEATURE_ID, 'kibana'],
      catalogue: [APP_ID],
      cases: {
        read: [APP_ID],
      },
      savedObject: {
        all: [],
        read: [...filesSavedObjectTypes],
      },
      ui: casesCapabilities.read,
    },
  },
  subFeatures: [casesSubFeatureDelete],
});

// TODO Add cases connector configuration
// It maps the AppFeatures keys to Kibana privileges
export const getCasesAppFeaturesConfig = (): AppFeaturesCasesConfig => ({
  [AppFeatureCasesKey.exampleCasesFeature]: {},
});
