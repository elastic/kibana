/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../../../common/constants/synthetics_alerts';

export interface PopoverState {
  id: string;
  open: boolean;
}

export const setAlertFlyoutVisible = createAction<{
  id: typeof SYNTHETICS_STATUS_RULE | typeof SYNTHETICS_TLS_RULE | null;
  isNewRuleFlyout: boolean;
} | null>('[UI] TOGGLE ALERT FLYOUT');

export const setBasePath = createAction<string>('[UI] SET BASE PATH');

export const setEsKueryString = createAction<string>('[UI] SET ES KUERY STRING');

export const setSearchTextAction = createAction<string>('[UI] SET SEARCH');

export const toggleIntegrationsPopover = createAction<PopoverState>(
  '[UI] TOGGLE INTEGRATION POPOVER STATE'
);

export const setSelectedMonitorId = createAction<string>('[UI] SET MONITOR ID');
