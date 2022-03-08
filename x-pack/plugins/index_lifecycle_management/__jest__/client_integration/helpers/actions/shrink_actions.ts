/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { Phase } from '../../../../common/types';
import { createFormSetValueAction } from './form_set_value_action';

export const createShrinkActions = (testBed: TestBed, phase: Phase) => {
  const { exists, form, component, find } = testBed;
  const toggleShrinkSelector = `${phase}-shrinkSwitch`;
  const shrinkSizeSelector = `${phase}-primaryShardSize`;
  const shrinkCountSelector = `${phase}-primaryShardCount`;

  const changeShrinkRadioButton = async (selector: string) => {
    await act(async () => {
      await find(selector).find('input').simulate('change');
    });
    component.update();
  };
  return {
    shrinkExists: () => exists(toggleShrinkSelector),
    setShrinkCount: async (value: string) => {
      if (!exists(shrinkCountSelector) && !exists(shrinkSizeSelector)) {
        await form.toggleEuiSwitch(toggleShrinkSelector);
      }
      if (!exists(shrinkCountSelector)) {
        await changeShrinkRadioButton(`${phase}-configureShardCount`);
      }
      await createFormSetValueAction(testBed, shrinkCountSelector)(value);
    },
    setShrinkSize: async (value: string) => {
      if (!exists(shrinkCountSelector) && !exists(shrinkSizeSelector)) {
        await form.toggleEuiSwitch(toggleShrinkSelector);
      }
      if (!exists(shrinkSizeSelector)) {
        await changeShrinkRadioButton(`${phase}-configureShardSize`);
      }
      await createFormSetValueAction(testBed, shrinkSizeSelector)(value);
    },
  };
};
