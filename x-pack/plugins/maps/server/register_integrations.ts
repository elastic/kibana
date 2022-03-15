/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup } from 'kibana/server';
import { CustomIntegrationsPluginSetup } from '../../../../src/plugins/custom_integrations/server';
import { APP_ID, OPEN_LAYER_WIZARD, getFullPath, WIZARD_ID } from '../common/constants';

export function registerIntegrations(
  core: CoreSetup,
  customIntegrations: CustomIntegrationsPluginSetup
) {
  customIntegrations.registerCustomIntegration({
    id: 'ingest_with_gdal',
    title: i18n.translate('xpack.maps.registerIntegrations.gdal.integrationTitle', {
      defaultMessage: 'GDAL',
    }),
    description: i18n.translate('xpack.maps.registerIntegrations.gdal.integrationDescription', {
      defaultMessage:
        'Upload shapefiles and ingest from relational databases such as PostGIS or Oracle Spatial with GDAL.',
    }),
    uiInternalPath:
      'https://www.elastic.co/blog/how-to-ingest-geospatial-data-into-elasticsearch-with-gdal',
    icons: [
      {
        type: 'svg',
        src: core.http.basePath.prepend(`/plugins/${APP_ID}/assets/gdal_logo.svg`),
      },
    ],
    categories: ['upload_file', 'geo'],
    shipper: 'other',
    isBeta: false,
  });
  customIntegrations.registerCustomIntegration({
    id: 'ingest_geojson',
    title: i18n.translate('xpack.maps.registerIntegrations.geojson.integrationTitle', {
      defaultMessage: 'GeoJSON',
    }),
    description: i18n.translate('xpack.maps.registerIntegrations.geojson.integrationDescription', {
      defaultMessage: 'Upload GeoJSON files with Elastic Maps.',
    }),
    uiInternalPath: `${getFullPath('')}#?${OPEN_LAYER_WIZARD}=${WIZARD_ID.GEO_FILE}`,
    icons: [
      {
        type: 'eui',
        src: 'logoMaps',
      },
    ],
    categories: ['upload_file', 'geo'],
    shipper: 'other',
    isBeta: false,
  });
  customIntegrations.registerCustomIntegration({
    id: 'ingest_shape',
    title: i18n.translate('xpack.maps.registerIntegrations.shapefile.integrationTitle', {
      defaultMessage: 'Shapefile',
    }),
    description: i18n.translate(
      'xpack.maps.registerIntegrations.shapefile.integrationDescription',
      {
        defaultMessage: 'Upload Shapefiles with Elastic Maps.',
      }
    ),
    uiInternalPath: `${getFullPath('')}#?${OPEN_LAYER_WIZARD}=${WIZARD_ID.GEO_FILE}`,
    icons: [
      {
        type: 'eui',
        src: 'logoMaps',
      },
    ],
    categories: ['upload_file', 'geo'],
    shipper: 'other',
    isBeta: false,
  });
}
