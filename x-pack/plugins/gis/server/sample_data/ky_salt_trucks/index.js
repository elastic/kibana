/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { savedObjects } from './saved_objects';
import { countiesFieldMappings } from './counties_field_mappings';

export function kySaltTrucksSpecProvider() {
  return {
    id: 'ky',
    name: 'KY Salt Trucks',
    description: 'Sample data with geo_point and geo_shape for exploring the GIS application.',
    previewImagePath: '/plugins/gis/resources/ky_outline.png',
    overviewDashboard: '6d9ccc60-bbb4-11e8-bef2-c924ce0878e2',
    defaultIndex: '6e853b20-bbb5-11e8-88aa-9d8656848e00',
    savedObjects: savedObjects,
    dataIndices: [
      {
        id: 'counties',
        dataPath: path.join(__dirname, './counties.json.gz'),
        fields: countiesFieldMappings,
        // index does not contain time fields so these are not used
        // Setting the fime field
        timeFields: ['there_are_no_timefields'],
        currentTimeMarker: '2018-01-09T00:00:00',
      }
    ]
  };
}
