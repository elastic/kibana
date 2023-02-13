/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCopyToClipboardActionFactory } from '@kbn/cell-actions';
import { KibanaServices } from '../../../common/lib/kibana';
import { fieldHasCellActions } from '../../utils';
import type { SecurityCellAction } from '../../types';

const ID = 'security_copyToClipboard';

export const createCopyToClipboardCellAction = ({
  order,
}: {
  order?: number;
}): SecurityCellAction => {
  const { notifications } = KibanaServices.get();
  const copyToClipboardActionFactory = createCopyToClipboardActionFactory({ notifications });
  return copyToClipboardActionFactory<SecurityCellAction>({
    id: ID,
    order,
    isCompatible: async ({ field }) => fieldHasCellActions(field.name),
  });
};
