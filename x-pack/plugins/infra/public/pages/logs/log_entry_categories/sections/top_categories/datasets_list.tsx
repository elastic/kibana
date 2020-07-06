/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { euiStyled } from '../../../../../../../observability/public';
import { LogEntryCategoryDataset } from '../../../../../../common/http_api/log_analysis';
import { getFriendlyNameForPartitionId } from '../../../../../../common/log_analysis';

export const DatasetsList: React.FunctionComponent<{
  datasets: LogEntryCategoryDataset[];
}> = ({ datasets }) => (
  <ul>
    {datasets.map((dataset) => {
      const datasetLabel = getFriendlyNameForPartitionId(dataset.name);
      return (
        <li key={datasetLabel}>
          <DatasetLabel>{datasetLabel}</DatasetLabel>
        </li>
      );
    })}
  </ul>
);

/*
 * These aim at aligning the list with the EuiHealth list in the neighboring
 * column.
 */
const DatasetLabel = euiStyled.div`
  display: inline-block;
  margin-bottom: 2.5px;
  margin-top: 1px;
`;
