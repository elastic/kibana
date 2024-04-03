/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorConfiguration } from '@kbn/search-connectors';

import { isConfigEntry } from '../../../../common/connectors/is_category_entry';

export const hasConfiguredConfiguration = (configuration: ConnectorConfiguration) => {
  return !Object.entries(configuration).find(
    ([, pair]) =>
      isConfigEntry(pair) && pair.required && (pair.value === undefined || pair.value === null)
  );
};
