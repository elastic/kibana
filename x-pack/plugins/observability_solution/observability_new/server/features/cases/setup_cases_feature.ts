/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { i18n } from '@kbn/i18n';
import {
  createUICapabilities as createCasesUICapabilities,
  getApiTags as getCasesApiTags,
} from '@kbn/cases-plugin/common';
import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import { casesFeatureId, observabilityFeatureId } from '../../../common/features/alerts_and_slos';
import { ObservabilityPluginSetupDependencies } from '../../types';

export function setupCasesFeature({ plugins }: { plugins: ObservabilityPluginSetupDependencies }) {
  const casesCapabilities = createCasesUICapabilities();
  const casesApiTags = getCasesApiTags(observabilityFeatureId);

  plugins.features.registerKibanaFeature({
    id: casesFeatureId,
    name: i18n.translate('xpack.observability.featureRegistry.linkObservabilityTitle', {
      defaultMessage: 'Cases',
    }),
    order: 1100,
    category: DEFAULT_APP_CATEGORIES.observability,
    app: [casesFeatureId, 'kibana'],
    catalogue: [observabilityFeatureId],
    cases: [observabilityFeatureId],
    privileges: {
      all: {
        api: casesApiTags.all,
        app: [casesFeatureId, 'kibana'],
        catalogue: [observabilityFeatureId],
        cases: {
          create: [observabilityFeatureId],
          read: [observabilityFeatureId],
          update: [observabilityFeatureId],
          push: [observabilityFeatureId],
        },
        savedObject: {
          all: [...filesSavedObjectTypes],
          read: [...filesSavedObjectTypes],
        },
        ui: casesCapabilities.all,
      },
      read: {
        api: casesApiTags.read,
        app: [casesFeatureId, 'kibana'],
        catalogue: [observabilityFeatureId],
        cases: {
          read: [observabilityFeatureId],
        },
        savedObject: {
          all: [],
          read: [...filesSavedObjectTypes],
        },
        ui: casesCapabilities.read,
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.observability.featureRegistry.deleteSubFeatureName', {
          defaultMessage: 'Delete',
        }),
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                api: casesApiTags.delete,
                id: 'cases_delete',
                name: i18n.translate(
                  'xpack.observability.featureRegistry.deleteSubFeatureDetails',
                  {
                    defaultMessage: 'Delete cases and comments',
                  }
                ),
                includeIn: 'all',
                savedObject: {
                  all: [...filesSavedObjectTypes],
                  read: [...filesSavedObjectTypes],
                },
                cases: {
                  delete: [observabilityFeatureId],
                },
                ui: casesCapabilities.delete,
              },
            ],
          },
        ],
      },
      {
        name: i18n.translate('xpack.observability.featureRegistry.casesSettingsSubFeatureName', {
          defaultMessage: 'Case settings',
        }),
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'cases_settings',
                name: i18n.translate(
                  'xpack.observability.featureRegistry.casesSettingsSubFeatureDetails',
                  {
                    defaultMessage: 'Edit case settings',
                  }
                ),
                includeIn: 'all',
                savedObject: {
                  all: [...filesSavedObjectTypes],
                  read: [...filesSavedObjectTypes],
                },
                cases: {
                  settings: [observabilityFeatureId],
                },
                ui: casesCapabilities.settings,
              },
            ],
          },
        ],
      },
    ],
  });
}
