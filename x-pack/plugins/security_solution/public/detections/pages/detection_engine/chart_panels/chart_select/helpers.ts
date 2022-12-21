/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';

import * as i18n from './translations';

export const TABLE_ID = 'table';
export const TREND_ID = 'trend';
export const TREEMAP_ID = 'treemap';
export const CHARTS_ID = 'charts';

export type AlertViewSelection = 'trend' | 'table' | 'treemap' | 'charts';

export interface ButtonProperties {
  'data-test-subj': string;
  icon: string;
  name: string;
}

export const getButtonProperties = (alertViewSelection: AlertViewSelection): ButtonProperties => {
  const table = { 'data-test-subj': alertViewSelection, icon: 'visTable', name: i18n.TABLE };

  switch (alertViewSelection) {
    case TABLE_ID:
      return table;
    case TREND_ID:
      return {
        'data-test-subj': alertViewSelection,
        icon: 'visBarVerticalStacked',
        name: i18n.TREND,
      };
    case TREEMAP_ID:
      return { 'data-test-subj': alertViewSelection, icon: 'grid', name: i18n.TREEMAP };
    case CHARTS_ID:
      return { 'data-test-subj': alertViewSelection, icon: 'visPie', name: i18n.CHARTS };
    default:
      return table;
  }
};

export const getContextMenuPanels = ({
  alertViewSelection,
  closePopover,
  setAlertViewSelection,
  isAlertsPageChartsEnabled,
}: {
  alertViewSelection: AlertViewSelection;
  closePopover: () => void;
  setAlertViewSelection: (alertViewSelection: AlertViewSelection) => void;
  isAlertsPageChartsEnabled: boolean;
}): EuiContextMenuPanelDescriptor[] => [
  {
    id: 0,
    items: [
      {
        ...getButtonProperties('table'),
        onClick: () => {
          closePopover();
          setAlertViewSelection('table');
        },
      },
      {
        ...getButtonProperties('trend'),
        onClick: () => {
          closePopover();
          setAlertViewSelection('trend');
        },
      },
      {
        ...getButtonProperties('treemap'),
        onClick: () => {
          closePopover();
          setAlertViewSelection('treemap');
        },
      },
      ...(isAlertsPageChartsEnabled
        ? [
            {
              ...getButtonProperties('charts'),
              onClick: () => {
                closePopover();
                setAlertViewSelection('charts');
              },
            },
          ]
        : []),
    ],
  },
];
