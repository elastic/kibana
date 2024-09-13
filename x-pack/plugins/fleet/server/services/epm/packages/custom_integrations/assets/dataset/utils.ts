/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

import type { CustomPackageDatasetConfiguration } from '../../../install';

export const generateDatastreamEntries = (
  datasets: CustomPackageDatasetConfiguration[],
  packageName: string
) => {
  return datasets.map((dataset) => {
    const { name, type } = dataset;
    return {
      type,
      dataset: `${name}`,
      title: `Data stream for the ${packageName} custom integration, and ${name} dataset.`,
      package: packageName,
      path: name,
      release: 'ga' as const,
      // NOTE: This ensures our default.yml pipeline is used as the default_pipeline in the index template
      ingest_pipeline: 'default',
      elasticsearch: {
        // TODO: Needs to be cast because https://github.com/elastic/elasticsearch-specification/pull/2445 hasn't landed yet, can be removed once it has
        'index_template.mappings': {
          subobjects: false,
        } as MappingTypeMapping,
      },
    };
  });
};
