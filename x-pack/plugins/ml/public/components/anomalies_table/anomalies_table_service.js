/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Service for firing and registering for events in the
 * anomalies table component.
 */

import { listenerFactoryProvider } from 'plugins/ml/factories/listener_factory';

class AnomaliesTableService {
  constructor() {
    const listenerFactory = listenerFactoryProvider();
    this.anomalyRecordMouseenter = listenerFactory();
    this.anomalyRecordMouseleave = listenerFactory();
  }
}

export const mlAnomaliesTableService = new AnomaliesTableService();
