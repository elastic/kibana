/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { ExamplesList } from '../../../examples_list';
import { DocumentStatsTable } from './document_stats';
import { ExpandedRowContent } from './expanded_row_content';

export const OtherContent: FC<FieldDataRowProps> = ({ config }) => {
  const { stats } = config;
  if (stats === undefined) return null;
  return (
    <ExpandedRowContent dataTestSubj={'dataVisualizerOtherContent'}>
      <DocumentStatsTable config={config} />
      {Array.isArray(stats.examples) && (
        <EuiFlexItem>
          <ExamplesList examples={stats.examples} />
        </EuiFlexItem>
      )}
    </ExpandedRowContent>
  );
};
