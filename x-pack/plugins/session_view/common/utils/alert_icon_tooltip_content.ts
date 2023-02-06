/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessEventAlertCategory } from '../types/process_tree';
import * as i18n from '../translations';

export const getAlertIconTooltipContent = (processEventAlertCategory: string) => {
  let tooltipContent = '';
  switch (processEventAlertCategory) {
    case ProcessEventAlertCategory.file:
      tooltipContent = i18n.ALERT_TYPE_TOOLTIP_FILE;
      break;
    case ProcessEventAlertCategory.network:
      tooltipContent = i18n.ALERT_TYPE_TOOLTIP_NETWORK;
      break;
    default:
      tooltipContent = i18n.ALERT_TYPE_TOOLTIP_PROCESS;
  }
  return tooltipContent;
};
