/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { ExamplesList } from '../../../index_based/components/field_data_row/examples_list';
import { DocumentStatsTable } from './document_stats';

export const GeoPointContent: FC<FieldDataRowProps> = ({ config }) => {
  const { stats } = config;
  if (stats?.examples === undefined) return null;

  return (
    <EuiFlexGroup data-test-subj={'mlDVGeoPointContent'} gutterSize={'xl'}>
      <DocumentStatsTable config={config} />
      <EuiFlexItem>
        <ExamplesList examples={stats.examples} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
