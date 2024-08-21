/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellAction, CellActionExecutionContext } from '@kbn/cell-actions';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { StartServices } from '../../types';
import type { SecurityCellActionExecutionContext } from './types';

export const enhanceActionWithTelemetry = (
  action: CellAction<CellActionExecutionContext>,
  services: StartServices
): CellAction<CellActionExecutionContext> => {
  const { telemetry } = services;
  const { execute, ...rest } = action;
  const enhancedExecute = (
    context: ActionExecutionContext<SecurityCellActionExecutionContext>
  ): Promise<void> => {
    telemetry.reportCellActionClicked({
      actionId: rest.id,
      displayName: rest.getDisplayName(context),
      fieldName: context.data.map(({ field }) => field.name).join(', '),
      metadata: context.metadata,
    });

    return execute(context);
  };

  return { ...rest, execute: enhancedExecute };
};
