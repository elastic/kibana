/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { management } from 'ui/management';

management.getSection('logstash').register('pipelines', {
  display: 'Pipelines',
  order: 10,
  url: '#/management/logstash/pipelines/'
});

management.getSection('logstash/pipelines').register('pipeline', {
  visible: false
});

management.getSection('logstash/pipelines/pipeline').register('edit', {
  display: 'Edit pipeline',
  order: 1,
  visible: false
});

management.getSection('logstash/pipelines/pipeline').register('new', {
  display: 'Create pipeline',
  order: 1,
  visible: false
});
