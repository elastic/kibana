/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { TopValues } from '../../../index_based/components/field_data_row/top_values';
import { DocumentStatsTable } from './document_stats';
import { ExpandedRowContent } from './expanded_row_content';

export const KeywordContent: FC<FieldDataRowProps> = ({ config }) => {
  const { stats } = config;
  const fieldFormat = 'fieldFormat' in config ? config.fieldFormat : undefined;

  return (
    <ExpandedRowContent dataTestSubj={'mlDVKeywordContent'}>
      <DocumentStatsTable config={config} />

      <TopValues stats={stats} fieldFormat={fieldFormat} barColor="secondary" />
    </ExpandedRowContent>
  );
};
