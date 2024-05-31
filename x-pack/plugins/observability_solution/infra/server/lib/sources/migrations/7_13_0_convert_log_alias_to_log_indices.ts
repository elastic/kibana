/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectMigrationFn } from '@kbn/core/server';
import { InfraSourceConfiguration } from '../../../../common/source_configuration/source_configuration';
import { LOGS_INDEX_PATTERN } from '../../../../common/constants';

type SevenTwelveZeroSourceConfig = Omit<InfraSourceConfiguration, 'logIndices'> & {
  logAlias: string;
};

export const convertLogAliasToLogIndices: SavedObjectMigrationFn<
  SevenTwelveZeroSourceConfig,
  InfraSourceConfiguration
> = (sourceConfigurationDocument) => {
  const { logAlias, ...otherAttributes } = sourceConfigurationDocument.attributes;

  const newAttributes: InfraSourceConfiguration = {
    ...otherAttributes,
    logIndices: {
      type: 'index_name',
      indexName: logAlias ?? LOGS_INDEX_PATTERN,
    },
  };

  return {
    ...sourceConfigurationDocument,
    attributes: newAttributes,
  };
};
