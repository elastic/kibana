/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuPrimaryActionItem } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { APM_APP_MENU_EBT_ACTIONS, apmAppMenuEbt } from './ebt_constants';

const addDataLabel = i18n.translate('xpack.apm.addDataButtonLabel', {
  defaultMessage: 'Add data',
});

export function getAddDataMenuItem({
  href,
}: {
  href: string;
}): AppMenuPrimaryActionItem | undefined {
  if (!href) {
    return undefined;
  }

  return {
    id: 'addData',
    label: addDataLabel,
    iconType: 'plusCircle',
    href,
    ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.ADD_DATA),
    testId: 'apmAddDataHeaderLink',
  };
}
