/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ControlGroupRuntimeState, ControlGroupRendererApi } from '@kbn/controls-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { useQuerySubscriber } from '@kbn/unified-field-list';
import { useSelector } from '@xstate/react';
import { useCallback } from 'react';
import { LogsExplorerControllerStateService } from '../state_machines/logs_explorer_controller';

export const useControlPanels = (
  logsExplorerControllerStateService: LogsExplorerControllerStateService,
  data: DataPublicPluginStart
) => {
  const { query, filters, fromDate, toDate } = useQuerySubscriber({ data });
  const timeRange: TimeRange = { from: fromDate!, to: toDate! };

  const controlPanels = useSelector(logsExplorerControllerStateService, (state) => {
    if (!('controlPanels' in state.context)) return;
    return state.context.controlPanels;
  });

  const getInitialState = useCallback(
    async (initialState: Partial<ControlGroupRuntimeState>) => {
      const state: Partial<ControlGroupRuntimeState> = {
        ...initialState,
        initialChildControlState: controlPanels ?? initialState.initialChildControlState,
      };

      return { initialState: state };
    },
    [controlPanels]
  );

  const setControlGroupAPI = useCallback(
    (controlGroupAPI: ControlGroupRendererApi | undefined) => {
      if (controlGroupAPI)
        logsExplorerControllerStateService.send({
          type: 'INITIALIZE_CONTROL_GROUP_API',
          controlGroupAPI,
        });
    },
    [logsExplorerControllerStateService]
  );

  return { getInitialState, setControlGroupAPI, query, filters, timeRange };
};
