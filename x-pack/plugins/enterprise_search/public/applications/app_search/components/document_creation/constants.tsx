/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
export const FLYOUT_CLOSE_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.appSearch.documentCreation.modalClose',
  { defaultMessage: 'Close' }
);

export const DOCUMENT_CREATION_ERRORS = {
  TITLE: i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.errorsTitle', {
    defaultMessage: 'Something went wrong. Please address the errors and try again.',
  }),
  NO_FILE: i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.noFileFound', {
    defaultMessage: 'No file found.',
  }),
  NO_VALID_FILE: i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.noValidFile', {
    defaultMessage: 'Problem parsing file.',
  }),
  NOT_VALID: i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.notValidJson', {
    defaultMessage: 'Document contents must be a valid JSON array or object.',
  }),
};
export const DOCUMENT_CREATION_WARNINGS = {
  TITLE: i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.warningsTitle', {
    defaultMessage: 'Warning!',
  }),
  LARGE_FILE: i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.largeFile', {
    defaultMessage:
      "You're uploading an extremely large file. This could potentially lock your browser, or take a very long time to process. If possible, try splitting your data up into multiple smaller files.",
  }),
};

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
