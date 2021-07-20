/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { IClickActionDescriptor } from '../';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { UISession } from '../../types';
import { createDeleteActionDescriptor } from './delete_button';
import { createExtendActionDescriptor } from './extend_button';
import { createInspectActionDescriptor } from './inspect_button';
import { ACTION } from './types';
import { createRenameActionDescriptor } from './rename_button';

export const getAction = (
  api: SearchSessionsMgmtAPI,
  actionType: string,
  uiSession: UISession,
  core: CoreStart
): IClickActionDescriptor | null => {
  switch (actionType) {
    case ACTION.INSPECT:
      return createInspectActionDescriptor(api, uiSession, core);
    case ACTION.DELETE:
      return createDeleteActionDescriptor(api, uiSession, core);
    case ACTION.EXTEND:
      return createExtendActionDescriptor(api, uiSession, core);
    case ACTION.RENAME:
      return createRenameActionDescriptor(api, uiSession, core);
    default:
      // eslint-disable-next-line no-console
      console.error(`Unknown action: ${actionType}`);
  }

  // Unknown action: do not show

  return null;
};
