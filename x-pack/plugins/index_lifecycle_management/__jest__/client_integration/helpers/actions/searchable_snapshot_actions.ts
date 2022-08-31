/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test-jest-helpers';
import { Phase } from '../../../../common/types';
import { createFormToggleAction } from './form_toggle_action';

export const createSearchableSnapshotActions = (testBed: TestBed, phase: Phase) => {
  const { exists, find, component } = testBed;
  const fieldSelector = `searchableSnapshotField-${phase}`;
  const licenseCalloutSelector = `${fieldSelector}.searchableSnapshotDisabledDueToLicense`;
  const toggleSelector = `${fieldSelector}.searchableSnapshotToggle`;

  const toggleSearchableSnapshot = createFormToggleAction(testBed, toggleSelector);
  return {
    searchableSnapshotDisabledDueToLicense: () =>
      exists(licenseCalloutSelector) && find(toggleSelector).props().disabled === true,
    searchableSnapshotsExists: () => exists(fieldSelector),
    toggleSearchableSnapshot,
    setSearchableSnapshot: async (value: string) => {
      if (!exists(`searchableSnapshotField-${phase}.searchableSnapshotCombobox`)) {
        await toggleSearchableSnapshot();
      }
      act(() => {
        find(`searchableSnapshotField-${phase}.searchableSnapshotCombobox`).simulate('change', [
          { label: value },
        ]);
      });
      component.update();
    },
  };
};
