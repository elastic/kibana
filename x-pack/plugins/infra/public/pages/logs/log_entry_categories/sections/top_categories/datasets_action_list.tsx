/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { LogEntryCategoryDataset } from '../../../../../../common/http_api/log_analysis';
import { TimeRange } from '../../../../../../common/http_api/shared';
import { getFriendlyNameForPartitionId } from '../../../../../../common/log_analysis';
import { AnalyzeCategoryDatasetInMlAction } from './analyze_dataset_in_ml_action';

export const DatasetActionsList: React.FunctionComponent<{
  categorizationJobId: string;
  categoryId: number;
  datasets: LogEntryCategoryDataset[];
  timeRange: TimeRange;
}> = ({ categorizationJobId, categoryId, datasets, timeRange }) => (
  <ul>
    {datasets.map((dataset) => {
      const datasetLabel = getFriendlyNameForPartitionId(dataset.name);
      return (
        <li key={datasetLabel}>
          <AnalyzeCategoryDatasetInMlAction
            categorizationJobId={categorizationJobId}
            categoryId={categoryId}
            dataset={dataset.name}
            timeRange={timeRange}
          />
        </li>
      );
    })}
  </ul>
);
