/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { isOfQueryType } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { CustomThresholdSearchSourceFields } from '../../../../common/custom_threshold_rule/types';

export const defaultQuery: Query = {
  language: 'kuery',
  query: '',
};

const searchConfigQueryWarning = i18n.translate(
  'xpack.observability.customThreshold.rule.alertFlyout.searchConfiguration.queryWarning',
  {
    defaultMessage:
      'Custom threshold does not support queries other than Query type, query was changed to default query.',
  }
);

export const getSearchConfiguration = (
  fields: SerializedSearchSourceFields,
  onWarning: (title: string) => void
): CustomThresholdSearchSourceFields => {
  if (fields.query && !isOfQueryType(fields.query)) {
    onWarning(searchConfigQueryWarning);
    return {
      ...fields,
      query: defaultQuery,
    };
  }
  return {
    ...fields,
    query: fields.query,
  };
};
