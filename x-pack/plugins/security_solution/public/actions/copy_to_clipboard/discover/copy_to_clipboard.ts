/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCopyToClipboardActionFactory as genericCreateCopyToClipboardActionFactory } from '@kbn/cell-actions';
import { fieldHasCellActions, isInSecurityApp } from '../../utils';
import type { StartServices } from '../../../types';
import type { SecurityCellAction } from '../../types';
import { SecurityCellActionType } from '../../constants';

export const createCopyToClipboardDiscoverCellActionFactory = ({
  services,
}: {
  services: StartServices;
}) => {
  const { notifications, application } = services;

  let currentAppId: string | undefined;
  application.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  const genericCopyToClipboardActionFactory = genericCreateCopyToClipboardActionFactory({
    notifications,
  });
  return genericCopyToClipboardActionFactory.combine<SecurityCellAction>({
    type: SecurityCellActionType.COPY,
    isCompatible: async ({ field }) =>
      isInSecurityApp(currentAppId) && fieldHasCellActions(field.name),
  });
};
