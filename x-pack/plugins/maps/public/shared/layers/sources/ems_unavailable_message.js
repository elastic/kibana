/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

const NO_EMS_ACCESS_MSG =
  'Kibana is unable to access Elastic Maps Service. Contact your system administrator';

const EMS_ACCESS_DISABLED_MSG =
  'Access to Elastic Maps Service has been disabled.' +
  ' Ask your system administrator to set "map.includeElasticMapsService" in kibana.yml.';

export function getEmsUnavailableMessage() {
  const isEmsEnabled = chrome.getInjected('isEmsEnabled', true);
  if (isEmsEnabled) {
    return NO_EMS_ACCESS_MSG;
  }

  return EMS_ACCESS_DISABLED_MSG;
}
