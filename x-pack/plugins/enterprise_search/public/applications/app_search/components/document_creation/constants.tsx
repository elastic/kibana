/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const FLYOUT_ARIA_LABEL_ID = 'documentCreationFlyoutHeadingId';

export const FLYOUT_CANCEL_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.appSearch.documentCreation.flyoutCancel',
  { defaultMessage: 'Cancel' }
);
export const FLYOUT_CONTINUE_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.appSearch.documentCreation.flyoutContinue',
  { defaultMessage: 'Continue' }
);

// This is indented the way it is to work with ApiCodeExample.
// Use dedent() when calling this alone
export const DOCUMENTS_API_JSON_EXAMPLE = `[
                {
                  "id": "park_rocky-mountain",
                  "title": "Rocky Mountain",
                  "description": "Bisected north to south by the Continental Divide, this portion of the Rockies has ecosystems varying from over 150 riparian lakes to montane and subalpine forests to treeless alpine tundra. Wildlife including mule deer, bighorn sheep, black bears, and cougars inhabit its igneous mountains and glacial valleys. Longs Peak, a classic Colorado fourteener, and the scenic Bear Lake are popular destinations, as well as the historic Trail Ridge Road, which reaches an elevation of more than 12,000 feet (3,700 m).",
                  "nps_link": "https://www.nps.gov/romo/index.htm",
                  "states": [
                    "Colorado"
                  ],
                  "visitors": 4517585,
                  "world_heritage_site": false,
                  "location": "40.4,-105.58",
                  "acres": 265795.2,
                  "square_km": 1075.6,
                  "date_established": "1915-01-26T06:00:00Z"
                },
                {
                  "id": "park_saguaro",
                  "title": "Saguaro",
                  "description": "Split into the separate Rincon Mountain and Tucson Mountain districts, this park is evidence that the dry Sonoran Desert is still home to a great variety of life spanning six biotic communities. Beyond the namesake giant saguaro cacti, there are barrel cacti, chollas, and prickly pears, as well as lesser long-nosed bats, spotted owls, and javelinas.",
                  "nps_link": "https://www.nps.gov/sagu/index.htm",
                  "states": [
                    "Arizona"
                  ],
                  "visitors": 820426,
                  "world_heritage_site": false,
                  "location": "32.25,-110.5",
                  "acres": 91715.72,
                  "square_km": 371.2,
                  "date_established": "1994-10-14T05:00:00Z"
                }
              ]`;
