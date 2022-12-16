/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ECS_ALLOWED_VALUES = i18n.translate(
  'xpack.securitySolution.dataQuality.compareFieldsTable.ecsAllowedValuesColumn',
  {
    defaultMessage: 'ECS (allowed values)',
  }
);

export const ECS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.dataQuality.compareFieldsTable.ecsDescriptionColumn',
  {
    defaultMessage: 'ECS description',
  }
);

export const ECS_MAPPING = i18n.translate(
  'xpack.securitySolution.dataQuality.compareFieldsTable.ecsMappingColumn',
  {
    defaultMessage: 'ECS (expected)',
  }
);

export const INDEX_UNALLOWED_VALUES = i18n.translate(
  'xpack.securitySolution.dataQuality.compareFieldsTable.indexUnallowedValuesColumn',
  {
    defaultMessage: 'Index (unallowed values)',
  }
);

export const INDEX_MAPPING = i18n.translate(
  'xpack.securitySolution.dataQuality.compareFieldsTable.indexMappingColumn',
  {
    defaultMessage: 'Index (actual)',
  }
);

export const FIELD = i18n.translate(
  'xpack.securitySolution.dataQuality.compareFieldsTable.fieldColumn',
  {
    defaultMessage: 'Field',
  }
);

export const SEARCH_FIELDS = i18n.translate(
  'xpack.securitySolution.dataQuality.compareFieldsTable.searchFieldsPlaceholder',
  {
    defaultMessage: 'Search fields',
  }
);
