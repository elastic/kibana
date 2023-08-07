/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  createUICapabilities as createCasesUICapabilities,
  getApiTags as getCasesApiTags,
} from '@kbn/cases-plugin/common';
import {
  CASES_CONNECTORS_CAPABILITY,
  GET_CONNECTORS_CONFIGURE_API_TAG,
} from '@kbn/cases-plugin/common/constants';
import type { AppFeaturesCasesConfig, BaseKibanaFeatureConfig } from './types';
import { APP_ID, CASES_FEATURE_ID } from '../../../common/constants';
import { CasesSubFeatureId } from './security_cases_kibana_sub_features';
import { AppFeatureCasesKey } from '../../../common/types/app_features';

const casesCapabilities = createCasesUICapabilities();
const casesApiTags = getCasesApiTags(APP_ID);

export const getCasesBaseKibanaFeature = (): BaseKibanaFeatureConfig => {
  // On SecuritySolution essentials cases does not have the connector feature
  const casesAllUICapabilities = casesCapabilities.all.filter(
    (capability) => capability !== CASES_CONNECTORS_CAPABILITY
  );

  const casesReadUICapabilities = casesCapabilities.read.filter(
    (capability) => capability !== CASES_CONNECTORS_CAPABILITY
  );

  const casesAllAPICapabilities = casesApiTags.all.filter(
    (capability) => capability !== GET_CONNECTORS_CONFIGURE_API_TAG
  );

  const casesReadAPICapabilities = casesApiTags.read.filter(
    (capability) => capability !== GET_CONNECTORS_CONFIGURE_API_TAG
  );

  return {
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
        api: casesAllAPICapabilities,
        app: [CASES_FEATURE_ID, 'kibana'],
        catalogue: [APP_ID],
        cases: {
          create: [APP_ID],
          read: [APP_ID],
          update: [APP_ID],
        },
        savedObject: {
          all: [...filesSavedObjectTypes],
          read: [...filesSavedObjectTypes],
        },
        ui: casesAllUICapabilities,
      },
      read: {
        api: casesReadAPICapabilities,
        app: [CASES_FEATURE_ID, 'kibana'],
        catalogue: [APP_ID],
        cases: {
          read: [APP_ID],
        },
        savedObject: {
          all: [],
          read: [...filesSavedObjectTypes],
        },
        ui: casesReadUICapabilities,
      },
    },
  };
};

export const getCasesBaseKibanaSubFeatureIds = (): CasesSubFeatureId[] => [
  CasesSubFeatureId.deleteCases,
];

/**
 * Maps the AppFeatures keys to Kibana privileges that will be merged
 * into the base privileges config for the Security Cases app.
 *
 * Privileges can be added in different ways:
 * - `privileges`: the privileges that will be added directly into the main Security Cases feature.
 * - `subFeatureIds`: the ids of the sub-features that will be added into the Cases subFeatures entry.
 * - `subFeaturesPrivileges`: the privileges that will be added into the existing Cases subFeature with the privilege `id` specified.
 */
export const getCasesAppFeaturesConfig = (): AppFeaturesCasesConfig => ({
  [AppFeatureCasesKey.casesConnectors]: {
    privileges: {
      all: {
        api: [GET_CONNECTORS_CONFIGURE_API_TAG], // Add cases connector get connectors API privileges
        ui: [CASES_CONNECTORS_CAPABILITY], // Add cases connector UI privileges
        cases: {
          push: [APP_ID], // Add cases connector push privileges
        },
      },
      read: {
        api: [GET_CONNECTORS_CONFIGURE_API_TAG], // Add cases connector get connectors API privileges
        ui: [CASES_CONNECTORS_CAPABILITY], // Add cases connector UI privileges
      },
    },
  },
});
