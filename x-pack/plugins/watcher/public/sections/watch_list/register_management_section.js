/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { management } from 'ui/management';
import 'plugins/watcher/services/license';
import 'plugins/watcher/styles/watcher_ui.less';

management.getSection('elasticsearch').register('watcher', {
  display: 'Watcher',
  order: 4,
  url: '#/management/elasticsearch/watcher/'
});

management.getSection('elasticsearch/watcher').register('watches', {
  display: 'Watches',
  order: 1
});

management.getSection('elasticsearch/watcher').register('watch', {
  visible: false
});

management.getSection('elasticsearch/watcher/watch').register('status', {
  display: 'Status',
  order: 1,
  visible: false
});

management.getSection('elasticsearch/watcher/watch').register('edit', {
  display: 'Edit',
  order: 2,
  visible: false
});

management.getSection('elasticsearch/watcher/watch').register('new', {
  display: 'New Watch',
  order: 1,
  visible: false
});

management.getSection('elasticsearch/watcher/watch').register('history-item', {
  order: 1,
  visible: false
});
