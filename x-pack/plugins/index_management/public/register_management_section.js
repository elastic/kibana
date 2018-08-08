/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { management } from 'ui/management';
import { BASE_PATH } from '../common/constants';

const esSection = management.getSection('elasticsearch');
esSection.register('index_management', {
  visible: true,
  display: 'Index Management',
  order: 1,
  url: `#${BASE_PATH}home`
});

