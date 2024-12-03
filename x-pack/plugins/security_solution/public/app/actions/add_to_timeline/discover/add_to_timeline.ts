/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellAction, CellActionFactory } from '@kbn/cell-actions';
import { isInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import type { SecurityAppStore } from '../../../../common/store';
import type { StartServices } from '../../../../types';
import { createAddToTimelineCellActionFactory } from '../cell_action/add_to_timeline';

export const createAddToTimelineDiscoverCellActionFactory = ({
  store,
  services,
}: {
  store: SecurityAppStore;
  services: StartServices;
}): CellActionFactory<CellAction> => {
  const { application } = services;

  let currentAppId: string | undefined;
  application.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  const securityAddToTimelineActionFactory = createAddToTimelineCellActionFactory({
    store,
    services,
  });

  return securityAddToTimelineActionFactory.combine<CellAction>({
    isCompatible: async () => isInSecurityApp(currentAppId),
  });
};
