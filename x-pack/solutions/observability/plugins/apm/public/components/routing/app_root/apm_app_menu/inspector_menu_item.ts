/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { APM_APP_MENU_EBT_ACTIONS, apmAppMenuEbt } from './ebt_constants';

const inspectLabel = i18n.translate('xpack.apm.inspectButtonText', {
  defaultMessage: 'Inspect',
});

export function getInspectorMenuItem({
  isEnabled,
  onInspect,
  order,
}: {
  isEnabled: boolean;
  onInspect: () => void;
  order: number;
}): AppMenuItemType | undefined {
  if (!isEnabled) {
    return undefined;
  }

  return {
    id: 'inspect',
    label: inspectLabel,
    iconType: 'inspect',
    testId: 'apmInspectHeaderLink',
    ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.OPEN_INSPECTOR),
    run: onInspect,
    order,
    overflow: true,
  };
}
