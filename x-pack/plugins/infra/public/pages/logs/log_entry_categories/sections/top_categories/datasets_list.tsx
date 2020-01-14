/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { getFriendlyNameForPartitionId } from '../../../../../../common/log_analysis';

export const DatasetsList: React.FunctionComponent<{
  datasets: string[];
}> = ({ datasets }) => (
  <ul>
    {datasets.sort().map(dataset => {
      const datasetLabel = getFriendlyNameForPartitionId(dataset);
      return <li key={datasetLabel}>{datasetLabel}</li>;
    })}
  </ul>
);
