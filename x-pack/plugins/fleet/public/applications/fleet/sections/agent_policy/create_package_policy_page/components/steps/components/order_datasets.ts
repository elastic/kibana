/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';

export function orderDatasets(datasetList: string[], name: string): string[] {
  const [relevantDatasets, otherDatasets] = partition(datasetList.sort(), (record) =>
    record.startsWith(name)
  );
  const datasets = relevantDatasets.concat(otherDatasets);
  return datasets;
}
