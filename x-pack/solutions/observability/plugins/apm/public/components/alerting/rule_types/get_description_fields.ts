/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { SearchConfigurationType } from '@kbn/response-ops-rule-params/common/search_configuration_schema';

export const getDescriptionFields: GetDescriptionFieldsFn = ({ rule, prebuildFields }) => {
  if (!rule || !prebuildFields) {
    return [];
  }

  const searchConfig = rule.params.searchConfiguration as SearchConfigurationType;

  if (!searchConfig) {
    return [];
  }

  if (searchConfig.query.query && typeof searchConfig.query.query === 'string') {
    return [prebuildFields.customQuery(searchConfig.query.query)];
  }

  return [];
};
