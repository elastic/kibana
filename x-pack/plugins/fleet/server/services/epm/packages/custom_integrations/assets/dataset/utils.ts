/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomPackageDatasetConfiguration } from '../../../install';

export const generateDatastreamEntries = (
  datasets: CustomPackageDatasetConfiguration[],
  packageName: string
) => {
  return datasets.map((dataset) => {
    const { name, type } = dataset;
    return {
      type,
      dataset: `${packageName}.${name}`,
      title: `Data stream for the ${packageName} custom integration, and ${name} dataset.`,
      package: packageName,
      path: name,
      release: 'ga' as const,
      // NOTE: This ensures our default.yml pipeline is used as the default_pipeline in the index template
      ingest_pipeline: 'default',
    };
  });
};
