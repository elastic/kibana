/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { APM_APP_MENU_EBT_ACTIONS, apmAppMenuEbt } from './ebt_constants';

const settingsLabel = i18n.translate('xpack.apm.settingsLinkLabel', {
  defaultMessage: 'Settings',
});

export function getSettingsMenuItem({
  href,
  order,
}: {
  href: string;
  order: number;
}): AppMenuItemType {
  return {
    id: 'settings',
    label: settingsLabel,
    iconType: 'gear',
    href,
    ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.VIEW_SETTINGS),
    testId: 'apmSettingsHeaderLink',
    order,
    overflow: true,
  };
}
