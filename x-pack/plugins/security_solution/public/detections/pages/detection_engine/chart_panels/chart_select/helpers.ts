/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor, EuiButtonGroupOptionProps } from '@elastic/eui';

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

export const getOptionProperties = (
  alertViewSelection: AlertViewSelection
): EuiButtonGroupOptionProps => {
  const charts = {
    id: CHARTS_ID,
    'data-test-subj': `chart-select-${CHARTS_ID}`,
    label: i18n.CHARTS_TITLE,
    value: CHARTS_ID,
  };

  switch (alertViewSelection) {
    case TABLE_ID:
      return {
        id: TABLE_ID,
        'data-test-subj': `chart-select-${TABLE_ID}`,
        label: i18n.COUNTS,
        value: TABLE_ID,
      };
    case TREND_ID:
      return {
        id: TREND_ID,
        'data-test-subj': `chart-select-${TREND_ID}`,
        label: i18n.TREND,
        value: TREND_ID,
      };
    case TREEMAP_ID:
      return {
        id: TREEMAP_ID,
        'data-test-subj': `chart-select-${TREEMAP_ID}`,
        label: i18n.TREEMAP,
        value: TREEMAP_ID,
      };
    case CHARTS_ID:
      return charts;
    default:
      return charts;
  }
};
