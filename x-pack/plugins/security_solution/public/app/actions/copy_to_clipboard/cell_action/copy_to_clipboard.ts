/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCopyToClipboardActionFactory as genericCreateCopyToClipboardActionFactory } from '@kbn/cell-actions/actions';
import { fieldHasCellActions } from '../../utils';
import type { StartServices } from '../../../../types';
import type { SecurityCellAction } from '../../types';
import { SecurityCellActionType } from '../../constants';

export const createCopyToClipboardCellActionFactory = ({
  services,
}: {
  services: StartServices;
}) => {
  const { notifications } = services;
  const genericCopyToClipboardActionFactory = genericCreateCopyToClipboardActionFactory({
    notifications,
  });
  return genericCopyToClipboardActionFactory.combine<SecurityCellAction>({
    type: SecurityCellActionType.COPY,
    isCompatible: async ({ data }) => {
      const field = data[0]?.field;

      return fieldHasCellActions(field.name);
    },
  });
};
