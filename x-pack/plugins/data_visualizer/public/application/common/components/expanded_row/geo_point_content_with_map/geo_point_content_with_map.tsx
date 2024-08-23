/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import { useMemo } from 'react';
import React, { useEffect, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ES_GEO_FIELD_TYPE, LayerDescriptor } from '@kbn/maps-plugin/common';
import { INITIAL_LOCATION } from '@kbn/maps-plugin/common';
import type { CombinedQuery } from '../../../../index_data_visualizer/types/combined_query';
import { ExpandedRowContent } from '../../stats_table/components/field_data_expanded_row/expanded_row_content';
import { DocumentStatsTable } from '../../stats_table/components/field_data_expanded_row/document_stats';
import { ExamplesList } from '../../examples_list';
import type { FieldVisConfig } from '../../stats_table/types';
import { useDataVisualizerKibana } from '../../../../kibana_context';
import { SUPPORTED_FIELD_TYPES } from '../../../../../../common/constants';
import { ExpandedRowPanel } from '../../stats_table/components/field_data_expanded_row/expanded_row_panel';

export const GeoPointContentWithMap: FC<{
  config: FieldVisConfig;
  dataView: DataView | undefined;
  combinedQuery?: CombinedQuery;
  esql?: string;
  timeFieldName?: string;
}> = ({ config, dataView, combinedQuery, esql, timeFieldName }) => {
  const { stats } = config;
  const [layerList, setLayerList] = useState<LayerDescriptor[]>([]);
  const {
    services: { maps: mapsPlugin, data },
  } = useDataVisualizerKibana();

  const query = useMemo(() => {
    return combinedQuery
      ? {
          query: combinedQuery.searchString,
          language: combinedQuery.searchQueryLanguage,
        }
      : undefined;
  }, [combinedQuery]);

  useEffect(() => {
    if (!mapsPlugin) {
      return;
    }

    if (
      !dataView?.id ||
      !config?.fieldName ||
      !(
        config.type === SUPPORTED_FIELD_TYPES.GEO_POINT ||
        config.type === SUPPORTED_FIELD_TYPES.GEO_SHAPE
      )
    ) {
      setLayerList([]);
      return;
    }

    let ignore = false;
    mapsPlugin.createLayerDescriptors
      .createESSearchSourceLayerDescriptor({
        indexPatternId: dataView.id,
        geoFieldName: config.fieldName,
        geoFieldType: config.type as ES_GEO_FIELD_TYPE,
      })
      .then((searchLayerDescriptor) => {
        if (ignore) {
          return;
        }
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
            dateField: dataView.timeFieldName ?? timeFieldName,
            geoField: config.fieldName,
            esql,
            narrowByGlobalSearch: true,
            narrowByGlobalTime: true,
            narrowByMapBounds: true,
            id: searchLayerDescriptor.sourceDescriptor!.id,
            type: 'ESQL',
            applyForceRefresh: true,
          };

          setLayerList([
            {
              ...searchLayerDescriptor,
              sourceDescriptor: esqlSourceDescriptor,
            },
          ]);
        } else {
          setLayerList([searchLayerDescriptor]);
        }
      })
      .catch(() => {
        if (!ignore) {
          setLayerList([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, [dataView, combinedQuery, esql, config, mapsPlugin, timeFieldName]);

  if (stats?.examples === undefined) return null;
  return (
    <ExpandedRowContent dataTestSubj={'dataVisualizerIndexBasedMapContent'}>
      <DocumentStatsTable config={config} />
      <ExamplesList examples={stats?.examples} />
      {mapsPlugin && (
        <ExpandedRowPanel className={'dvPanel__wrapper dvMap__wrapper'} grow={true}>
          <mapsPlugin.Map
            layerList={layerList}
            hideFilterActions={true}
            mapSettings={{
              initialLocation: INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS,
              autoFitToDataBounds: true,
            }}
            filters={data.query.filterManager.getFilters()}
            query={query}
            timeRange={data.query.timefilter.timefilter.getTime()}
          />
        </ExpandedRowPanel>
      )}
    </ExpandedRowContent>
  );
};
