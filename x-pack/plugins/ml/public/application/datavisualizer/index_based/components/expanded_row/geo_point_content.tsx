/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ExamplesList } from '../../../index_based/components/field_data_row/examples_list';
import { FieldVisConfig } from '../../../stats_table/types';
import { IndexPattern } from '../../../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { MlEmbeddedMapComponent } from '../../../../components/ml_embedded_map';
import { ML_JOB_FIELD_TYPES } from '../../../../../../common/constants/field_types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { CreateLayerDescriptorParams } from '../../../../../../../maps/public/classes/sources/es_search_source';
import { ES_GEO_FIELD_TYPE } from '../../../../../../../maps/common/constants';
import { LayerDescriptor } from '../../../../../../../maps/common/descriptor_types';
import { useMlKibana } from '../../../../contexts/kibana';
import { DocumentStatsTable } from '../../../stats_table/components/field_data_expanded_row/document_stats';

export const GeoPointContent: FC<{
  config: FieldVisConfig;
  indexPattern: IndexPattern | undefined;
  combinedQuery: { searchString: string; searchQueryLanguage: string };
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
        const params: CreateLayerDescriptorParams = {
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
    <EuiFlexGroup data-test-subj={'mlDVIndexBasedMapContent'} gutterSize={'xl'}>
      <DocumentStatsTable config={config} />

      <EuiFlexItem>
        <ExamplesList examples={stats.examples} />
      </EuiFlexItem>
      <EuiFlexItem className={'mlDataVisualizerMapWrapper'}>
        <MlEmbeddedMapComponent layerList={layerList} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
