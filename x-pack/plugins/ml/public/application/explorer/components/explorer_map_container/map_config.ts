/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnomalyRecordDoc } from '../../../../../common/types/anomalies';

const FEATURE = 'Feature';
const POINT = 'Point';

function getAnomalyFeatures(anomalies: AnomalyRecordDoc[], type: 'actual' | 'typical') {
  return anomalies.map((anomaly) => {
    // Must reverse coordinates here. Map expects [lon, lat] - anomalies are stored as [lat, lon] for lat_lon jobs
    const coordinates = anomaly[type]?.reverse();

    return {
      type: FEATURE,
      geometry: {
        type: POINT,
        coordinates,
      },
      properties: {
        ...(anomaly.entityName ? { [anomaly.entityName]: anomaly.entityValue } : {}),
        severity: anomaly.severity,
        [type]: coordinates,
      },
    };
  });
}

export const getMLAnomaliesTypicalLayer = (anomalies: any) => {
  return {
    id: 'anomalies_typical_layer',
    label: 'Typical',
    sourceDescriptor: {
      id: 'b7486535-171b-4d3b-bb2e-33c1a0a2854e',
      type: 'GEOJSON_FILE',
      __featureCollection: {
        features: getAnomalyFeatures(anomalies, 'typical'),
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
    type: 'VECTOR',
  };
};

// GEOJSON_FILE type layer does not support source-type to inject custom data for styling
export const getMLAnomaliesActualLayer = (anomalies: any) => {
  return {
    id: 'anomalies_actual_layer',
    label: 'Actual',
    sourceDescriptor: {
      id: 'b7486535-171b-4d3b-bb2e-33c1a0a2854d',
      type: 'GEOJSON_FILE',
      __featureCollection: {
        features: getAnomalyFeatures(anomalies, 'actual'),
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
            color: '#FF0000',
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
    type: 'VECTOR',
  };
};
