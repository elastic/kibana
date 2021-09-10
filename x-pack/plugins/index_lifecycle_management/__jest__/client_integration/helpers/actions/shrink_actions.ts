/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test/jest';
import { Phase } from '../../../../common/types';
import { createFormSetValueAction } from './form_set_value_action';

export const createShrinkActions = (testBed: TestBed, phase: Phase) => {
  const { exists, form } = testBed;
  const toggleShrinkSelector = `${phase}-shrinkSwitch`;
  const shrinkSizeSelector = `${phase}-primaryShardSize`;
  const shrinkCountSelector = `${phase}-primaryShardCount`;

  const toggleIsUsingShardCount = async () =>
    await testBed.find(`${phase}-toggleIsUsingShardSize`).simulate('click');
  return {
    shrinkExists: () => exists(toggleShrinkSelector),
    setShrinkCount: async (value: string) => {
      if (!exists(shrinkCountSelector) && !exists(shrinkSizeSelector)) {
        await form.toggleEuiSwitch(toggleShrinkSelector);
      }
      if (!exists(shrinkCountSelector)) {
        await toggleIsUsingShardCount();
      }
      await createFormSetValueAction(testBed, shrinkCountSelector)(value);
    },
    setShrinkSize: async (value: string) => {
      if (!exists(shrinkCountSelector) && !exists(shrinkSizeSelector)) {
        await form.toggleEuiSwitch(toggleShrinkSelector);
      }
      if (!exists(shrinkSizeSelector)) {
        await toggleIsUsingShardCount();
      }
      await createFormSetValueAction(testBed, shrinkSizeSelector)(value);
    },
    toggleIsUsingShardCount,
  };
};
