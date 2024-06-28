/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { Feature, Point } from 'geojson';
import type { FieldDataRowProps } from '../../stats_table/types/field_data_row';
import { DocumentStatsTable } from '../../stats_table/components/field_data_expanded_row/document_stats';
import { convertWKTGeoToLonLat, getGeoPointsLayer } from './format_utils';
import { ExpandedRowContent } from '../../stats_table/components/field_data_expanded_row/expanded_row_content';
import { ExamplesList } from '../../examples_list';
import { ExpandedRowPanel } from '../../stats_table/components/field_data_expanded_row/expanded_row_panel';
import { useDataVisualizerKibana } from '../../../../kibana_context';

export const DEFAULT_GEO_REGEX = RegExp('(?<lat>.+) (?<lon>.+)');

export const GeoPointContent: FC<FieldDataRowProps> = ({ config }) => {
  const {
    services: { maps: mapsService },
  } = useDataVisualizerKibana();

  const formattedResults = useMemo(() => {
    const { stats } = config;

    if (stats === undefined || stats.topValues === undefined) return null;
    if (Array.isArray(stats.topValues)) {
      const geoPointsFeatures: Array<Feature<Point>> = [];

      // reformatting the top values from POINT (-2.359207 51.37837) to (-2.359207, 51.37837)
      const formattedExamples = [];

      for (let i = 0; i < stats.topValues.length; i++) {
        const value = stats.topValues[i];
        const coordinates = convertWKTGeoToLonLat(value.key);
        if (coordinates) {
          const formattedGeoPoint = `(${coordinates.lat}, ${coordinates.lon})`;
          formattedExamples.push(coordinates);

          geoPointsFeatures.push({
            type: 'Feature',
            id: `fileDataVisualizer-${config.fieldName}-${i}`,
            geometry: {
              type: 'Point',
              coordinates: [coordinates.lat, coordinates.lon],
            },
            properties: {
              value: formattedGeoPoint,
              count: value.doc_count,
            },
          });
        }
      }

      if (geoPointsFeatures.length > 0) {
        return {
          examples: formattedExamples,
          pointsLayer: getGeoPointsLayer(geoPointsFeatures),
        };
      }
    }
  }, [config]);
  return (
    <ExpandedRowContent dataTestSubj={'dataVisualizerGeoPointContent'}>
      <DocumentStatsTable config={config} />
      {formattedResults?.examples && <ExamplesList examples={formattedResults.examples} />}
      {mapsService && formattedResults?.pointsLayer && (
        <ExpandedRowPanel className={'dvPanel__wrapper dvMap__wrapper'} grow={true}>
          <mapsService.PassiveMap passiveLayer={formattedResults.pointsLayer} />
        </ExpandedRowPanel>
      )}
    </ExpandedRowContent>
  );
};
