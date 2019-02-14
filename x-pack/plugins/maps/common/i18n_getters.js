/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { APP_TITLE_EN } from './constants';


export function getAppTitle() {
  return i18n.translate('xpack.maps.appTitle', {
    defaultMessage: APP_TITLE_EN
  });
}
