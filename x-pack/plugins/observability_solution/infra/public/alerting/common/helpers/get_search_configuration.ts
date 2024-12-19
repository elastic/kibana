/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import { Filter, isOfQueryType } from '@kbn/es-query';

export interface InfraThresholdSearchSourceFields extends SerializedSearchSourceFields {
  query?: Query;
  filter?: Array<Pick<Filter, 'meta' | 'query'>>;
}

const searchConfigQueryWarning = i18n.translate(
  'xpack.infra.rule.alertFlyout.searchConfiguration.queryWarning',
  {
    defaultMessage:
      'Infrastructure rules do not support queries other than Query type, query was changed to default query.',
  }
);

export const defaultQuery: Query = {
  language: 'kuery',
  query: '',
};

export const getSearchConfiguration = (
  fields: SerializedSearchSourceFields,
  onWarning: (title: string) => void
): InfraThresholdSearchSourceFields => {
  if (fields.query && !isOfQueryType(fields.query)) {
    onWarning(searchConfigQueryWarning);
    return adjustSearchConfigurationFilter({
      ...fields,
      query: defaultQuery,
    });
  }
  return adjustSearchConfigurationFilter({
    ...fields,
    query: fields.query,
  });
};

const adjustSearchConfigurationFilter = (
  searchConfiguration: InfraThresholdSearchSourceFields
): InfraThresholdSearchSourceFields => {
  // Only meta and query fields are saved in the rule params, so we ignore other fields such as $state
  const filter = searchConfiguration.filter
    ? searchConfiguration.filter.map(({ meta, query }) => ({ meta, query }))
    : undefined;

  return {
    ...searchConfiguration,
    filter,
  };
};
