/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition, sortBy } from 'lodash';

import type { DataStream } from '../../../../../../../../../common/types';

export function sortDatastreamsByDataset(datasetList: DataStream[], name: string): DataStream[] {
  const [relevantDatasets, otherDatasets] = partition(sortBy(datasetList, 'dataset'), (record) =>
    record.dataset.startsWith(name)
  );
  const datasets = relevantDatasets.concat(otherDatasets);
  return datasets;
}
