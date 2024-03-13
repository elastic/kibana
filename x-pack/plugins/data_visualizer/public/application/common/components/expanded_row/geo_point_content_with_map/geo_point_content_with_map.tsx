/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ES_GEO_FIELD_TYPE, LayerDescriptor } from '@kbn/maps-plugin/common';
import type { CombinedQuery } from '../../../../index_data_visualizer/types/combined_query';
import { ExpandedRowContent } from '../../stats_table/components/field_data_expanded_row/expanded_row_content';
import { DocumentStatsTable } from '../../stats_table/components/field_data_expanded_row/document_stats';
import { ExamplesList } from '../../examples_list';
import type { FieldVisConfig } from '../../stats_table/types';
import { useDataVisualizerKibana } from '../../../../kibana_context';
import { SUPPORTED_FIELD_TYPES } from '../../../../../../common/constants';
import { EmbeddedMapComponent } from '../../embedded_map';
import { ExpandedRowPanel } from '../../stats_table/components/field_data_expanded_row/expanded_row_panel';

export const GeoPointContentWithMap: FC<{
  config: FieldVisConfig;
  dataView: DataView | undefined;
  combinedQuery?: CombinedQuery;
  esql?: string;
}> = ({ config, dataView, combinedQuery, esql }) => {
  const { stats } = config;
  const [layerList, setLayerList] = useState<LayerDescriptor[]>([]);
  const {
    services: { maps: mapsPlugin, data },
  } = useDataVisualizerKibana();

  // Update the layer list  with updated geo points upon refresh
  useEffect(() => {
    async function updateIndexPatternSearchLayer() {
      if (
        dataView?.id !== undefined &&
        config !== undefined &&
        config.fieldName !== undefined &&
        (config.type === SUPPORTED_FIELD_TYPES.GEO_POINT ||
          config.type === SUPPORTED_FIELD_TYPES.GEO_SHAPE)
      ) {
        const params = {
          indexPatternId: dataView.id,
          geoFieldName: config.fieldName,
          geoFieldType: config.type as ES_GEO_FIELD_TYPE,
          filters: data.query.filterManager.getFilters() ?? [],

          ...(typeof esql === 'string' ? { esql, type: 'ESQL' } : {}),
          ...(combinedQuery
            ? {
                query: {
                  query: combinedQuery.searchString,
                  language: combinedQuery.searchQueryLanguage,
                },
              }
            : {}),
        };
        const searchLayerDescriptor = mapsPlugin
          ? await mapsPlugin.createLayerDescriptors.createESSearchSourceLayerDescriptor(params)
          : null;

        if (searchLayerDescriptor?.sourceDescriptor) {
          if (esql !== undefined) {
            // Currently, createESSearchSourceLayerDescriptor doesn't support ES|QL yet
            // but we can manually override the source descriptor with the ES|QL ESQLSourceDescriptor
            const esqlSourceDescriptor = {
              columns: [
                {
                  name: config.fieldName,
                  type: config.type,
                },
              ],
              dataViewId: dataView.id,
              dateField: dataView.timeFieldName,
              geoField: config.fieldName,
              esql,
              narrowByGlobalSearch: true,
              narrowByGlobalTime: true,
              narrowByMapBounds: true,
              id: searchLayerDescriptor.sourceDescriptor.id,
              type: 'ESQL',
              applyForceRefresh: true,
            };

            setLayerList([
              ...layerList,
              {
                ...searchLayerDescriptor,
                sourceDescriptor: esqlSourceDescriptor,
              },
            ]);
          } else {
            setLayerList([...layerList, searchLayerDescriptor]);
          }
        }
      }
    }
    updateIndexPatternSearchLayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataView, combinedQuery, esql, config, mapsPlugin, data.query]);

  if (stats?.examples === undefined) return null;
  return (
    <ExpandedRowContent dataTestSubj={'dataVisualizerIndexBasedMapContent'}>
      <DocumentStatsTable config={config} />
      <ExamplesList examples={stats?.examples} />
      <ExpandedRowPanel className={'dvPanel__wrapper dvMap__wrapper'} grow={true}>
        <EmbeddedMapComponent layerList={layerList} />
      </ExpandedRowPanel>
    </ExpandedRowContent>
  );
};
