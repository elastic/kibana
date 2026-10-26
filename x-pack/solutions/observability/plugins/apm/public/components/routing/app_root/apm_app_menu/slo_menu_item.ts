/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuItemType, AppMenuPopoverItem } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import type { ApmIndicatorType } from '../../../../../common/slo_indicator_types';
import { APM_APP_MENU_EBT_ACTIONS, apmAppMenuEbt } from './ebt_constants';

const sloLabel = i18n.translate('xpack.apm.home.sloMenu.slosHeaderLink', {
  defaultMessage: 'SLOs',
});

const createLatencySloLabel = i18n.translate('xpack.apm.home.sloMenu.createLatencySlo', {
  defaultMessage: 'Create APM latency SLO',
});

const createAvailabilitySloLabel = i18n.translate('xpack.apm.home.sloMenu.createAvailabilitySlo', {
  defaultMessage: 'Create APM availability SLO',
});

const manageSlosLabel = i18n.translate('xpack.apm.home.sloMenu.manageSlos', {
  defaultMessage: 'Manage SLOs',
});

export function getSloMenuItem({
  canReadSlos,
  canWriteSlos,
  manageSlosUrl,
  onCreateSlo,
  order,
}: {
  canReadSlos: boolean;
  canWriteSlos: boolean;
  manageSlosUrl: string | undefined;
  onCreateSlo: (indicatorType: ApmIndicatorType) => void;
  order: number;
}): AppMenuItemType | undefined {
  if (!canReadSlos && !canWriteSlos) {
    return undefined;
  }

  const sloItems: AppMenuPopoverItem[] = [];

  if (canWriteSlos) {
    sloItems.push(
      {
        id: 'createLatencySlo',
        label: createLatencySloLabel,
        testId: 'apmSlosMenuItemCreateLatencySlo',
        ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.CREATE_LATENCY_SLO),
        run: () => {
          onCreateSlo('sli.apm.transactionDuration');
        },
      },
      {
        id: 'createAvailabilitySlo',
        label: createAvailabilitySloLabel,
        testId: 'apmSlosMenuItemCreateAvailabilitySlo',
        ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.CREATE_AVAILABILITY_SLO),
        run: () => {
          onCreateSlo('sli.apm.transactionErrorRate');
        },
      }
    );
  }

  if (canReadSlos && manageSlosUrl) {
    sloItems.push({
      id: 'manageSlos',
      label: manageSlosLabel,
      iconType: 'tableOfContents',
      href: manageSlosUrl,
      ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.MANAGE_SLOS),
      testId: 'apmSlosMenuItemManageSlos',
    });
  }

  if (sloItems.length === 0) {
    return undefined;
  }

  return {
    id: 'slos',
    label: sloLabel,
    iconType: 'visGauge',
    testId: 'apmSlosHeaderLink',
    ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.OPEN_SLO_MENU),
    items: sloItems,
    order,
  };
}
