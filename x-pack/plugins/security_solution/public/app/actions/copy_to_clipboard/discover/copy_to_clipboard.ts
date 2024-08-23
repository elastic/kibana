/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellAction, CellActionFactory } from '@kbn/cell-actions';
import { isInSecurityApp } from '../../utils';
import type { StartServices } from '../../../../types';
import { createCopyToClipboardCellActionFactory } from '../cell_action/copy_to_clipboard';

export const createCopyToClipboardDiscoverCellActionFactory = ({
  services,
}: {
  services: StartServices;
}): CellActionFactory<CellAction> => {
  const { application } = services;

  let currentAppId: string | undefined;
  application.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  const genericCopyToClipboardActionFactory = createCopyToClipboardCellActionFactory({
    services,
  });

  return genericCopyToClipboardActionFactory.combine<CellAction>({
    isCompatible: async () => isInSecurityApp(currentAppId),
  });
};
