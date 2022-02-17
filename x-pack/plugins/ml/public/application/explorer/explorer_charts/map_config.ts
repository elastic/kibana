/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_ORIGIN, LAYER_TYPE, STYLE_TYPE } from '../../../../../maps/common';
import { SEVERITY_COLOR_RAMP } from '../../../../common';
import { AnomaliesTableData } from '../explorer_utils';

const FEATURE = 'Feature';
const POINT = 'Point';

function getAnomalyFeatures(
  anomalies: AnomaliesTableData['anomalies'],
  type: 'actual_point' | 'typical_point'
) {
  const anomalyFeatures = [];
  for (let i = 0; i < anomalies.length; i++) {
    const anomaly = anomalies[i];
    const geoResults = anomaly.geo_results || (anomaly?.causes && anomaly?.causes[0]?.geo_results);
    const coordinateStr = geoResults && geoResults[type];
    if (coordinateStr !== undefined) {
      // Must reverse coordinates here. Map expects [lon, lat] - anomalies are stored as [lat, lon] for lat_lon jobs
      const coordinates = coordinateStr
        .split(',')
        .map((point: string) => Number(point))
        .reverse();

      anomalyFeatures.push({
        type: FEATURE,
        geometry: {
          type: POINT,
          coordinates,
        },
        properties: {
          record_score: Math.floor(anomaly.record_score),
          [type]: coordinates.map((point: number) => point.toFixed(2)),
        },
      });
    }
  }
  return anomalyFeatures;
}

export const getMLAnomaliesTypicalLayer = (anomalies: AnomaliesTableData['anomalies']) => {
  return {
    id: 'anomalies_typical_layer',
    label: 'Typical',
    sourceDescriptor: {
      id: 'b7486535-171b-4d3b-bb2e-33c1a0a2854e',
      type: 'GEOJSON_FILE',
      __featureCollection: {
        features: getAnomalyFeatures(anomalies, 'typical_point'),
        type: 'FeatureCollection',
      },
    },
    visible: true,
    style: {
      type: 'VECTOR',
      properties: {
        fillColor: {
          type: 'STATIC',
          options: {
            color: '#98A2B2',
          },
        },
        lineColor: {
          type: 'STATIC',
          options: {
            color: '#fff',
          },
        },
        lineWidth: {
          type: 'STATIC',
          options: {
            size: 2,
          },
        },
        iconSize: {
          type: 'STATIC',
          options: {
            size: 6,
          },
        },
      },
    },
    type: LAYER_TYPE.GEOJSON_VECTOR,
  };
};

export const getMLAnomaliesActualLayer = (anomalies: any) => {
  return {
    id: 'anomalies_actual_layer',
    label: 'Actual',
    sourceDescriptor: {
      id: 'b7486535-171b-4d3b-bb2e-33c1a0a2854d',
      type: 'GEOJSON_FILE',
      __fields: [
        {
          name: 'record_score',
          type: 'number',
        },
      ],
      __featureCollection: {
        features: getAnomalyFeatures(anomalies, 'actual_point'),
        type: 'FeatureCollection',
      },
    },
    visible: true,
    style: {
      type: 'VECTOR',
      properties: {
        fillColor: {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            customColorRamp: SEVERITY_COLOR_RAMP,
            field: {
              name: 'record_score',
              origin: FIELD_ORIGIN.SOURCE,
            },
            useCustomColorRamp: true,
          },
        },
        lineColor: {
          type: 'STATIC',
          options: {
            color: '#fff',
          },
        },
        lineWidth: {
          type: 'STATIC',
          options: {
            size: 2,
          },
        },
        iconSize: {
          type: 'STATIC',
          options: {
            size: 6,
          },
        },
      },
    },
    type: LAYER_TYPE.GEOJSON_VECTOR,
  };
};
