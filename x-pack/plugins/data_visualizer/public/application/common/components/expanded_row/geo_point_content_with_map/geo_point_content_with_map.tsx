/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { IndexPattern } from '../../../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { CombinedQuery } from '../../../../index_data_visualizer/types/combined_query';
import { ExpandedRowContent } from '../../stats_table/components/field_data_expanded_row/expanded_row_content';
import { DocumentStatsTable } from '../../stats_table/components/field_data_expanded_row/document_stats';
import { ExamplesList } from '../../examples_list';
import { FieldVisConfig } from '../../stats_table/types';
import { LayerDescriptor } from '../../../../../../../maps/common/descriptor_types';
import { useDataVisualizerKibana } from '../../../../kibana_context';
import { JOB_FIELD_TYPES } from '../../../../../../common';
import { ES_GEO_FIELD_TYPE } from '../../../../../../../maps/common';
import { EmbeddedMapComponent } from '../../embedded_map';

export const GeoPointContentWithMap: FC<{
  config: FieldVisConfig;
  indexPattern: IndexPattern | undefined;
  combinedQuery: CombinedQuery;
}> = ({ config, indexPattern, combinedQuery }) => {
  const { stats } = config;
  const [layerList, setLayerList] = useState<LayerDescriptor[]>([]);
  const {
    services: { maps: mapsPlugin },
  } = useDataVisualizerKibana();

  // Update the layer list  with updated geo points upon refresh
  useEffect(() => {
    async function updateIndexPatternSearchLayer() {
      if (
        indexPattern?.id !== undefined &&
        config !== undefined &&
        config.fieldName !== undefined &&
        (config.type === JOB_FIELD_TYPES.GEO_POINT || config.type === JOB_FIELD_TYPES.GEO_SHAPE)
      ) {
        const params = {
          indexPatternId: indexPattern.id,
          geoFieldName: config.fieldName,
          geoFieldType: config.type as ES_GEO_FIELD_TYPE,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexPattern, combinedQuery, config, mapsPlugin]);

  if (stats?.examples === undefined) return null;
  return (
    <ExpandedRowContent dataTestSubj={'dataVisualizerIndexBasedMapContent'}>
      <DocumentStatsTable config={config} />

      <EuiFlexItem style={{ maxWidth: '50%' }}>
        <ExamplesList examples={stats.examples} />
      </EuiFlexItem>
      <EuiFlexItem className={'dataVisualizerMapWrapper'}>
        <EmbeddedMapComponent layerList={layerList} />
      </EuiFlexItem>
    </ExpandedRowContent>
  );
};
