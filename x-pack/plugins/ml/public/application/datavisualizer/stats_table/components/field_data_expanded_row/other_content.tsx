/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { ExamplesList } from '../../../index_based/components/field_data_row/examples_list';
import { DocumentStatsTable } from './document_stats';
import { ExpandedRowContent } from './expanded_row_content';

export const OtherContent: FC<FieldDataRowProps> = ({ config }) => {
  const { stats } = config;
  if (stats === undefined) return null;
  return (
    <ExpandedRowContent dataTestSubj={'mlDVOtherContent'}>
      <DocumentStatsTable config={config} />
      {Array.isArray(stats.examples) && <ExamplesList examples={stats.examples} />}
    </ExpandedRowContent>
  );
};
