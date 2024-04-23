/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ControlGroupInput } from '@kbn/controls-plugin/common';
import { ControlGroupAPI } from '@kbn/controls-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { Query, TimeRange } from '@kbn/es-query';
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

  const getInitialInput = useCallback(
    async (initialInput: Partial<ControlGroupInput>) => {
      const input: Partial<ControlGroupInput> = {
        ...initialInput,
        viewMode: ViewMode.VIEW,
        panels: controlPanels ?? initialInput.panels,
        filters: filters ?? [],
        query: query as Query,
        timeRange: { from: fromDate!, to: toDate! },
      };

      return { initialInput: input };
    },
    [controlPanels, filters, fromDate, query, toDate]
  );

  const setControlGroupAPI = useCallback(
    (controlGroupAPI: ControlGroupAPI) => {
      logsExplorerControllerStateService.send({
        type: 'INITIALIZE_CONTROL_GROUP_API',
        controlGroupAPI,
      });
    },
    [logsExplorerControllerStateService]
  );

  return { getInitialInput, setControlGroupAPI, query, filters, timeRange };
};
