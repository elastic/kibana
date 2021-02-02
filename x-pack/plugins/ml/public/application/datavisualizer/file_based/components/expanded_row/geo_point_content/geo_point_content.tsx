/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo } from 'react';

import { EuiFlexItem } from '@elastic/eui';
import { Feature, Point } from 'geojson';
import type { FieldDataRowProps } from '../../../../stats_table/types/field_data_row';
import { DocumentStatsTable } from '../../../../stats_table/components/field_data_expanded_row/document_stats';
import { MlEmbeddedMapComponent } from '../../../../../components/ml_embedded_map';
import { convertWKTGeoToLonLat, getGeoPointsLayer } from './format_utils';
import { ExpandedRowContent } from '../../../../stats_table/components/field_data_expanded_row/expanded_row_content';
import { ExamplesList } from '../../../../index_based/components/field_data_row/examples_list';

export const DEFAULT_GEO_REGEX = RegExp('(?<lat>.+) (?<lon>.+)');

export const GeoPointContent: FC<FieldDataRowProps> = ({ config }) => {
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
            id: `ml-${config.fieldName}-${i}`,
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
          layerList: [getGeoPointsLayer(geoPointsFeatures)],
        };
      }
    }
  }, [config]);
  return (
    <ExpandedRowContent dataTestSubj={'mlDVGeoPointContent'}>
      <DocumentStatsTable config={config} />
      {formattedResults && Array.isArray(formattedResults.examples) && (
        <EuiFlexItem>
          <ExamplesList examples={formattedResults.examples} />
        </EuiFlexItem>
      )}
      {formattedResults && Array.isArray(formattedResults.layerList) && (
        <EuiFlexItem
          className={'mlDataVisualizerMapWrapper'}
          data-test-subj={'mlDataVisualizerEmbeddedMap'}
        >
          <MlEmbeddedMapComponent layerList={formattedResults.layerList} />
        </EuiFlexItem>
      )}
    </ExpandedRowContent>
  );
};
