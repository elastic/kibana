/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test-jest-helpers';
import { createFormToggleAction } from './form_toggle_action';
import { createFormSetValueAction } from './form_set_value_action';

const createSetPrimaryShardSizeAction =
  (testBed: TestBed) => async (value: string, units?: string) => {
    const { find, component } = testBed;

    await act(async () => {
      find('hot-selectedMaxPrimaryShardSize').simulate('change', { target: { value } });
    });
    component.update();

    if (units) {
      act(() => {
        find('hot-selectedMaxPrimaryShardSize.show-filters-button').simulate('click');
      });
      component.update();

      act(() => {
        find(`hot-selectedMaxPrimaryShardSize.filter-option-${units}`).simulate('click');
      });
      component.update();
    }
  };

const createSetMaxAgeAction = (testBed: TestBed) => async (value: string, units?: string) => {
  const { find, component } = testBed;

  await act(async () => {
    find('hot-selectedMaxAge').simulate('change', { target: { value } });
  });
  component.update();

  if (units) {
    act(() => {
      find('hot-selectedMaxAgeUnits.show-filters-button').simulate('click');
    });
    component.update();

    act(() => {
      find(`hot-selectedMaxAgeUnits.filter-option-${units}`).simulate('click');
    });
    component.update();
  }
};

const createSetMaxSizeAction = (testBed: TestBed) => async (value: string, units?: string) => {
  const { find, component } = testBed;

  await act(async () => {
    find('hot-selectedMaxSizeStored').simulate('change', { target: { value } });
  });
  component.update();

  if (units) {
    act(() => {
      find('hot-selectedMaxSizeStoredUnits.show-filters-button').simulate('click');
    });
    component.update();

    act(() => {
      find(`hot-selectedMaxSizeStoredUnits.filter-option-${units}`).simulate('click');
    });
    component.update();
  }
};

export const createRolloverActions = (testBed: TestBed) => {
  const { exists } = testBed;
  return {
    rollover: {
      toggle: createFormToggleAction(testBed, 'rolloverSwitch'),
      toggleDefault: createFormToggleAction(testBed, 'useDefaultRolloverSwitch'),
      setMaxPrimaryShardSize: createSetPrimaryShardSizeAction(testBed),
      setMaxDocs: createFormSetValueAction(testBed, 'hot-selectedMaxDocuments'),
      setMaxAge: createSetMaxAgeAction(testBed),
      setMaxSize: createSetMaxSizeAction(testBed),
      hasSettingRequiredCallout: (): boolean => exists('rolloverSettingsRequired'),
    },
  };
};
