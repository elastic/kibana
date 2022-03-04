/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { TutorialsCategory } from '../../../../../../src/plugins/home/server';
import { getNewMapPath, APP_ID } from '../../../common/constants';

export function emsBoundariesSpecProvider({
  emsLandingPageUrl,
  prependBasePath,
}: {
  emsLandingPageUrl: string;
  prependBasePath: (path: string) => string;
}) {
  const instructions = {
    instructionSets: [
      {
        instructionVariants: [
          {
            id: 'EMS',
            instructions: [
              {
                title: i18n.translate('xpack.maps.tutorials.ems.downloadStepTitle', {
                  defaultMessage: 'Download Elastic Maps Service boundaries',
                }),
                textPre: i18n.translate('xpack.maps.tutorials.ems.downloadStepText', {
                  defaultMessage:
                    '1. Navigate to Elastic Maps Service [landing page]({emsLandingPageUrl}/).\n\
2. In the left sidebar, select an administrative boundary.\n\
3. Click `Download GeoJSON` button.',
                  values: {
                    emsLandingPageUrl,
                  },
                }),
              },
              {
                title: i18n.translate('xpack.maps.tutorials.ems.uploadStepTitle', {
                  defaultMessage: 'Index Elastic Maps Service boundaries',
                }),
                textPre: i18n.translate('xpack.maps.tutorials.ems.uploadStepText', {
                  defaultMessage:
                    '1. Open [Maps]({newMapUrl}).\n\
2. Click `Add layer`, then select `Upload GeoJSON`.\n\
3. Upload the GeoJSON file and click `Import file`.',
                  values: {
                    newMapUrl: prependBasePath(getNewMapPath()),
                  },
                }),
              },
            ],
          },
        ],
      },
    ],
  };

  return () => ({
    id: 'emsBoundaries',
    name: i18n.translate('xpack.maps.tutorials.ems.nameTitle', {
      defaultMessage: 'Elastic Maps Service',
    }),
    category: TutorialsCategory.OTHER,
    shortDescription: i18n.translate('xpack.maps.tutorials.ems.shortDescription', {
      defaultMessage: 'Add administrative boundaries to your data with Elastic Maps Service.',
    }),
    longDescription: i18n.translate('xpack.maps.tutorials.ems.longDescription', {
      defaultMessage:
        '[Elastic Maps Service (EMS)](https://www.elastic.co/elastic-maps-service) \
hosts tile layers and vector shapes of administrative boundaries. \
Indexing EMS administrative boundaries in Elasticsearch allows for search on boundary property fields.',
    }),
    euiIconType: 'emsApp',
    completionTimeMinutes: 1,
    previewImagePath: `/plugins/${APP_ID}/assets/boundaries_screenshot.png`,
    onPrem: instructions,
    elasticCloud: instructions,
    integrationBrowserCategories: ['upload_file', 'geo'],
  });
}
