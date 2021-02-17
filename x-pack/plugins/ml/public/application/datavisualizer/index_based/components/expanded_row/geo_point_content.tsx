/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';

import { EuiFlexItem } from '@elastic/eui';
import { ExamplesList } from '../../../index_based/components/field_data_row/examples_list';
import { MlEmbeddedMapComponent } from '../../../../components/ml_embedded_map';
import { ML_JOB_FIELD_TYPES } from '../../../../../../common/constants/field_types';
import { ES_GEO_FIELD_TYPE } from '../../../../../../../maps/common/constants';
import { useMlKibana } from '../../../../contexts/kibana';
import { DocumentStatsTable } from '../../../stats_table/components/field_data_expanded_row/document_stats';
import { ExpandedRowContent } from '../../../stats_table/components/field_data_expanded_row/expanded_row_content';
import type { CombinedQuery } from '../../common';
import type { IndexPattern } from '../../../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import type { LayerDescriptor } from '../../../../../../../maps/common/descriptor_types';
import type { FieldVisConfig } from '../../../stats_table/types';

export const GeoPointContent: FC<{
  config: FieldVisConfig;
  indexPattern: IndexPattern | undefined;
  combinedQuery: CombinedQuery;
}> = ({ config, indexPattern, combinedQuery }) => {
  const { stats } = config;
  const [layerList, setLayerList] = useState<LayerDescriptor[]>([]);
  const {
    services: { maps: mapsPlugin },
  } = useMlKibana();

  // Update the layer list  with updated geo points upon refresh
  useEffect(() => {
    async function updateIndexPatternSearchLayer() {
      if (
        indexPattern?.id !== undefined &&
        config !== undefined &&
        config.fieldName !== undefined &&
        config.type === ML_JOB_FIELD_TYPES.GEO_POINT
      ) {
        const params = {
          indexPatternId: indexPattern.id,
          geoFieldName: config.fieldName,
          geoFieldType: config.type as ES_GEO_FIELD_TYPE.GEO_POINT,
          query: {
            query: combinedQuery.searchString,
            language: combinedQuery.searchQueryLanguage,
          },
        };
        const searchLayerDescriptor = mapsPlugin
          ? await mapsPlugin.createLayerDescriptors.createESSearchSourceLayerDescriptor(params)
          : null;
        if (searchLayerDescriptor) {
          setLayerList([...layerList, searchLayerDescriptor]);
        }
      }
    }
    updateIndexPatternSearchLayer();
  }, [indexPattern, config.fieldName, combinedQuery]);

  if (stats?.examples === undefined) return null;
  return (
    <ExpandedRowContent dataTestSubj={'mlDVIndexBasedMapContent'}>
      <DocumentStatsTable config={config} />

      <EuiFlexItem>
        <ExamplesList examples={stats.examples} />
      </EuiFlexItem>
      <EuiFlexItem className={'mlDataVisualizerMapWrapper'}>
        <MlEmbeddedMapComponent layerList={layerList} />
      </EuiFlexItem>
    </ExpandedRowContent>
  );
};
