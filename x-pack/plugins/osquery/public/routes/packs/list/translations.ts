/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PRE_BUILT_TITLE = i18n.translate(
  'xpack.osquery.packList.prePackagedPacks.emptyPromptTitle',
  {
    defaultMessage: 'Load Elastic prebuilt packs',
  }
);

export const LOAD_PREBUILT_PACKS_BUTTON = i18n.translate(
  'xpack.osquery.packList.prePackagedPacks.loadButtonLabel',
  {
    defaultMessage: 'Load Elastic prebuilt packs',
  }
);

export const PRE_BUILT_MSG = i18n.translate(
  'xpack.osquery.packList.prePackagedPacks.emptyPromptTitle.emptyPromptMessage',
  {
    defaultMessage:
      'A pack is a set of queries that you can schedule. Load prebuilt packs or create your own.',
  }
);
