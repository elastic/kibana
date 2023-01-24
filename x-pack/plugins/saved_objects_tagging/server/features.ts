/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { KibanaFeatureConfig } from '@kbn/features-plugin/server';
import { tagSavedObjectTypeName, tagManagementSectionId, tagFeatureId } from '../common/constants';

export const savedObjectsTaggingFeature: KibanaFeatureConfig = {
  id: tagFeatureId,
  name: i18n.translate('xpack.savedObjectsTagging.feature.featureName', {
    defaultMessage: 'Tag Management',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  order: 1800,
  app: [],
  management: {
    kibana: [tagManagementSectionId],
  },
  privileges: {
    all: {
      savedObject: {
        all: [tagSavedObjectTypeName],
        read: [],
      },
      api: [],
      management: {
        kibana: [tagManagementSectionId],
      },
      ui: ['view', 'create', 'edit', 'delete', 'assign'],
    },
    read: {
      savedObject: {
        all: [],
        read: [tagSavedObjectTypeName],
      },
      management: {
        kibana: [tagManagementSectionId],
      },
      api: [],
      ui: ['view', 'assign'],
    },
  },
};
