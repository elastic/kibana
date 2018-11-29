/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';

export const SPACES_FEATURE_DESCRIPTION = i18n.translate(
  'xpack.spaces.featureRegistryDescription',
  {
    defaultMessage: 'Organize your dashboards and other saved objects into meaningful categories.',
  }
);

export const MANAGE_SPACES_URL = chrome.addBasePath(`/app/kibana#/management/spaces/list`);
