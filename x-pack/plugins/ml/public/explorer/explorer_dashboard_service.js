/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Service for firing and registering for events across the different
 * components in the Explorer dashboard.
 */

import { listenerFactoryProvider } from 'plugins/ml/factories/listener_factory';

function mlExplorerDashboardServiceFactory() {
  const service = {
    allowCellRangeSelection: false
  };

  const listenerFactory = listenerFactoryProvider();
  const dragSelect = service.dragSelect = listenerFactory();
  const swimlaneCellClick = service.swimlaneCellClick = listenerFactory();
  const swimlaneDataChange = service.swimlaneDataChange = listenerFactory();
  const swimlaneRenderDone = service.swimlaneRenderDone = listenerFactory();
  const chartsInitDone = service.chartsInitDone = listenerFactory();
  service.anomalyDataChange = listenerFactory();

  service.init = function () {
    // Clear out any old listeners.
    dragSelect.unwatchAll();
    swimlaneCellClick.unwatchAll();
    swimlaneDataChange.unwatchAll();
    swimlaneRenderDone.unwatchAll();
    chartsInitDone.unwatchAll();
  };

  return service;
}

export const mlExplorerDashboardService = mlExplorerDashboardServiceFactory();
