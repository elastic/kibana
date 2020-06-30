/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { TutorialsCategory } from '../../../../../../src/plugins/home/server';
import { getNewMapPath } from '../../../common/constants';

export function emsBoundariesSpecProvider({
  emsLandingPageUrl,
  prependBasePath,
}: {
  emsLandingPageUrl: string;
  prependBasePath: (path: string) => string;
}) {
  return () => ({
    id: 'emsBoundaries',
    name: i18n.translate('xpack.maps.tutorials.ems.nameTitle', {
      defaultMessage: 'EMS Boundaries',
    }),
    category: TutorialsCategory.OTHER,
    shortDescription: i18n.translate('xpack.maps.tutorials.ems.shortDescription', {
      defaultMessage: 'Administrative boundaries from Elastic Maps Service.',
    }),
    longDescription: i18n.translate('xpack.maps.tutorials.ems.longDescription', {
      defaultMessage:
        '[Elastic Maps Service (EMS)](https://www.elastic.co/elastic-maps-service) \
hosts tile layers and vector shapes of administrative boundaries. \
Indexing EMS administrative boundaries in Elasticsearch allows for search on boundary property fields.',
    }),
    euiIconType: 'emsApp',
    completionTimeMinutes: 1,
    previewImagePath: '/plugins/maps/assets/boundaries_screenshot.png',
    onPrem: {
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
                      '1. Navigate to Elastic Maps Service [landing page]({emsLandingPageUrl}).\n\
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
                      '1. Open [Elastic Maps]({newMapUrl}).\n\
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
    },
  });
}
