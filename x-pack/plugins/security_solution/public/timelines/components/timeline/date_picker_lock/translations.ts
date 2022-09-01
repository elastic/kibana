/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP = i18n.translate(
  'xpack.securitySolution.timeline.properties.lockDatePickerTooltip',
  {
    defaultMessage:
      'Disable syncing of date/time range between the currently viewed page and your timeline',
  }
);

export const UNLOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP = i18n.translate(
  'xpack.securitySolution.timeline.properties.unlockDatePickerTooltip',
  {
    defaultMessage:
      'Enable syncing of date/time range between the currently viewed page and your timeline',
  }
);

export const LOCK_SYNC_MAIN_DATE_PICKER_ARIA = i18n.translate(
  'xpack.securitySolution.timeline.properties.lockDatePickerDescription',
  {
    defaultMessage: 'Lock global date picker to timeline date picker',
  }
);

export const UNLOCK_SYNC_MAIN_DATE_PICKER_ARIA = i18n.translate(
  'xpack.securitySolution.timeline.properties.unlockDatePickerDescription',
  {
    defaultMessage: 'Unlock global date picker from timeline date picker',
  }
);
