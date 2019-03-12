/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n }  from '@kbn/i18n';
import { LICENSE_TYPE_BASIC } from '../../../../common/constants';

export const PLUGIN = {
  ID: 'license_management',
  NAME: i18n.translate('xpack.licenseMgmt.managementSectionDisplayName', {
    defaultMessage: 'License Management',
  }),
  MINIMUM_LICENSE_REQUIRED: LICENSE_TYPE_BASIC,
};
