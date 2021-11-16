/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup } from 'kibana/server';
import { CustomIntegrationsPluginSetup } from '../../../../src/plugins/custom_integrations/server';
import { APP_ID } from '../common/constants';

export function registerIntegrations(
  core: CoreSetup,
  customIntegrations: CustomIntegrationsPluginSetup
) {
  customIntegrations.registerCustomIntegration({
    id: 'ingest_with_gdal',
    title: i18n.translate('xpack.maps.registerIntegrations.gdal.integrationTitle', {
      defaultMessage: 'Upload geo data with GDAL',
    }),
    description: i18n.translate('xpack.maps.registerIntegrations.gdal.integrationDescription', {
      defaultMessage:
        'Upload shapefiles and ingest from relational databases such as PostGOIS or Oracle Spatial with GDAL.',
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
}
