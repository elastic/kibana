/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem } from '@elastic/eui';
import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { IndexPattern } from '../../../../../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import { ES_GEO_FIELD_TYPE } from '../../../../../../../maps/common/constants';
import type { LayerDescriptor } from '../../../../../../../maps/common/descriptor_types/layer_descriptor_types';
import { JOB_FIELD_TYPES } from '../../../../../../common/constants';
import type { CombinedQuery } from '../../../../index_data_visualizer/types/combined_query';
import { useDataVisualizerKibana } from '../../../../kibana_context';
import { EmbeddedMapComponent } from '../../embedded_map/embedded_map';
import { ExamplesList } from '../../examples_list/examples_list';
import { DocumentStatsTable } from '../../stats_table/components/field_data_expanded_row/document_stats';
import { ExpandedRowContent } from '../../stats_table/components/field_data_expanded_row/expanded_row_content';
import type { FieldVisConfig } from '../../stats_table/types/field_vis_config';

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
