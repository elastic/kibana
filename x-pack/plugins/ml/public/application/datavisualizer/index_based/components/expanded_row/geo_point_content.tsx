/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ExamplesList } from '../../../index_based/components/field_data_row/examples_list';
import { FieldVisConfig } from '../../../stats_table/types';
import { IndexPattern } from '../../../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { EmbeddedMapComponent } from './geo_index_pattern_embedded_map';

export const GeoPointContent: FC<{
  config: FieldVisConfig;
  indexPattern: IndexPattern | undefined;
  combinedQuery: { searchQuery: any };
}> = ({ config, indexPattern, combinedQuery }) => {
  const { stats } = config;
  if (stats?.examples === undefined) return null;

  return (
    <EuiFlexGroup data-test-subj={'mlDVIndexBasedMapContent'} gutterSize={'xl'}>
      <EuiFlexItem>
        <ExamplesList examples={stats.examples} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EmbeddedMapComponent
          config={config}
          indexPattern={indexPattern}
          combinedQuery={combinedQuery}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
