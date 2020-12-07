/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

export const LOCK_SYNC_MAIN_DATE_PICKER_LABEL = i18n.translate(
  'xpack.securitySolution.timeline.properties.lockedDatePickerLabel',
  {
    defaultMessage: 'Date picker is locked to global date picker',
  }
);

export const UNLOCK_SYNC_MAIN_DATE_PICKER_LABEL = i18n.translate(
  'xpack.securitySolution.timeline.properties.unlockedDatePickerLabel',
  {
    defaultMessage: 'Date picker is NOT locked to global date picker',
  }
);

export const LOCK_SYNC_MAIN_DATE_PICKER_ARIA = i18n.translate(
  'xpack.securitySolution.timeline.properties.lockDatePickerDescription',
  {
    defaultMessage: 'Lock date picker to global date picker',
  }
);

export const UNLOCK_SYNC_MAIN_DATE_PICKER_ARIA = i18n.translate(
  'xpack.securitySolution.timeline.properties.unlockDatePickerDescription',
  {
    defaultMessage: 'Unlock date picker to global date picker',
  }
);
