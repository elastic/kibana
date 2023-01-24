/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey } from '../../../../../../common/runtime_types';
import { useSelectedMonitor } from './use_selected_monitor';

export const useMonitorQueryId = () => {
  const { monitor } = useSelectedMonitor();

  return monitor?.[ConfigKey.MONITOR_QUERY_ID];
};
