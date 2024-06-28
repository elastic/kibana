/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { ExamplesList } from '../../../examples_list';
import { DocumentStatsTable } from './document_stats';
import { ExpandedRowContent } from './expanded_row_content';

export const OtherContent: FC<FieldDataRowProps> = ({ config }) => {
  const { stats } = config;
  if (stats === undefined) return null;
  return stats.count === undefined ? (
    <>{Array.isArray(stats.examples) && <ExamplesList examples={stats.examples} />}</>
  ) : (
    <ExpandedRowContent dataTestSubj={'dataVisualizerOtherContent'}>
      <DocumentStatsTable config={config} />
      {Array.isArray(stats.examples) && <ExamplesList examples={stats.examples} />}
    </ExpandedRowContent>
  );
};
