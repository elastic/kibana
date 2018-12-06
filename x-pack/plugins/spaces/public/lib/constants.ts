/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';

let SpacesFeatureDescription;

export const getSpacesFeatureDescription = () => {
  if (!SpacesFeatureDescription) {
    SpacesFeatureDescription = i18n.translate('xpack.spaces.featureDescription', {
      defaultMessage:
        'Organize your dashboards and other saved objects into meaningful categories.',
    });
  }

  return SpacesFeatureDescription;
};

export const MANAGE_SPACES_URL = chrome.addBasePath(`/app/kibana#/management/spaces/list`);
