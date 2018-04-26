/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Service for firing and registering for events in the
 * anomalies table component.
 */

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { listenerFactoryProvider } from 'plugins/ml/factories/listener_factory';

module.service('mlAnomaliesTableService', function () {

  const listenerFactory = listenerFactoryProvider();
  this.anomalyRecordMouseenter = listenerFactory();
  this.anomalyRecordMouseleave = listenerFactory();
  this.filterChange = listenerFactory();

});
