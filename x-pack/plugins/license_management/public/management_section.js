/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { management } from 'ui/management';
import { BASE_PATH } from '../common/constants';

management.getSection('elasticsearch').register('license_management', {
  visible: true,
  display: 'License Management',
  order: 4,
  url: `#${BASE_PATH}home`
});

