/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertViewSelection } from './helpers';
import {
  getButtonProperties,
  getContextMenuPanels,
  TABLE_ID,
  TREEMAP_ID,
  TREND_ID,
  CHARTS_ID,
} from './helpers';
import * as i18n from './translations';

describe('helpers', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('getButtonProperties', () => {
    test('it returns the expected properties when alertViewSelection is Trend', () => {
      expect(getButtonProperties(TREND_ID)).toEqual({
        'data-test-subj': TREND_ID,
        icon: 'visBarVerticalStacked',
        name: i18n.TREND,
      });
    });

    test('it returns the expected properties when alertViewSelection is Table', () => {
      expect(getButtonProperties(TABLE_ID)).toEqual({
        'data-test-subj': TABLE_ID,
        icon: 'visTable',
        name: i18n.TABLE,
      });
    });

    test('it returns the expected properties when alertViewSelection is Treemap', () => {
      expect(getButtonProperties(TREEMAP_ID)).toEqual({
        'data-test-subj': TREEMAP_ID,
        icon: 'grid',
        name: i18n.TREEMAP,
      });
    });

    test('it returns the expected properties when alertViewSelection is charts', () => {
      expect(getButtonProperties(CHARTS_ID)).toEqual({
        'data-test-subj': CHARTS_ID,
        icon: 'visPie',
        name: i18n.CHARTS,
      });
    });
  });

  describe('getContextMenuPanels', () => {
    const alertViewSelections: AlertViewSelection[] = ['trend', 'table', 'treemap', 'charts'];
    const closePopover = jest.fn();
    const setAlertViewSelection = jest.fn();

    alertViewSelections.forEach((alertViewSelection) => {
      test(`it returns the expected panel id when alertViewSelection is '${alertViewSelection}'`, () => {
        const panels = getContextMenuPanels({
          alertViewSelection,
          closePopover,
          setAlertViewSelection,
          isAlertsPageChartsEnabled: true, // remove after charts is implemented
        });

        expect(panels[0].id).toEqual(0);
      });

      test(`onClick invokes setAlertViewSelection with '${alertViewSelection}' item when alertViewSelection is '${alertViewSelection}'`, () => {
        const panels = getContextMenuPanels({
          alertViewSelection,
          closePopover,
          setAlertViewSelection,
          isAlertsPageChartsEnabled: true, // remove after charts is implemented
        });

        const item = panels[0].items?.find((x) => x['data-test-subj'] === alertViewSelection);
        (item?.onClick as () => void)();

        expect(setAlertViewSelection).toBeCalledWith(alertViewSelection);
      });

      test(`onClick invokes closePopover when alertViewSelection is '${alertViewSelection}'`, () => {
        const panels = getContextMenuPanels({
          alertViewSelection,
          closePopover,
          setAlertViewSelection,
          isAlertsPageChartsEnabled: true, // remove after charts is implemented
        });

        const item = panels[0].items?.find((x) => x['data-test-subj'] === alertViewSelection);
        (item?.onClick as () => void)();

        expect(closePopover).toBeCalled();
      });
    });
  });
});
