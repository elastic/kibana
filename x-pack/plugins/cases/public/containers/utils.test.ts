/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  valueToUpdateIsSettings,
  valueToUpdateIsStatus,
  createUpdateSuccessToaster,
  constructAssigneesFilter,
  constructReportersFilter,
} from './utils';

import type { Case } from './types';

const caseBeforeUpdate = {
  comments: [
    {
      type: 'alert',
    },
  ],
  settings: {
    syncAlerts: true,
  },
} as Case;

const caseAfterUpdate = { title: 'My case' } as Case;

describe('utils', () => {
  describe('valueToUpdateIsSettings', () => {
    it('returns true if key is settings', () => {
      expect(valueToUpdateIsSettings('settings', 'value')).toBe(true);
    });

    it('returns false if key is NOT settings', () => {
      expect(valueToUpdateIsSettings('tags', 'value')).toBe(false);
    });
  });

  describe('valueToUpdateIsStatus', () => {
    it('returns true if key is status', () => {
      expect(valueToUpdateIsStatus('status', 'value')).toBe(true);
    });

    it('returns false if key is NOT status', () => {
      expect(valueToUpdateIsStatus('tags', 'value')).toBe(false);
    });
  });

  describe('createUpdateSuccessToaster', () => {
    it('creates the correct toast when sync alerts is turned on and case has alerts', () => {
      // We remove the id as is randomly generated
      const toast = createUpdateSuccessToaster(caseBeforeUpdate, caseAfterUpdate, 'settings', {
        syncAlerts: true,
      });

      expect(toast).toEqual({
        title: 'Alerts in "My case" have been synced',
      });
    });

    it('creates the correct toast when sync alerts is turned on and case does NOT have alerts', () => {
      // We remove the id as is randomly generated
      const toast = createUpdateSuccessToaster(
        { ...caseBeforeUpdate, comments: [] },
        caseAfterUpdate,
        'settings',
        {
          syncAlerts: true,
        }
      );

      expect(toast).toEqual({
        title: 'Updated "My case"',
      });
    });

    it('creates the correct toast when sync alerts is turned off and case has alerts', () => {
      // We remove the id as is randomly generated
      const toast = createUpdateSuccessToaster(caseBeforeUpdate, caseAfterUpdate, 'settings', {
        syncAlerts: false,
      });

      expect(toast).toEqual({
        title: 'Updated "My case"',
      });
    });

    it('creates the correct toast when the status change, case has alerts, and sync alerts is on', () => {
      // We remove the id as is randomly generated
      const toast = createUpdateSuccessToaster(
        caseBeforeUpdate,
        caseAfterUpdate,
        'status',
        'closed'
      );

      expect(toast).toEqual({
        title: 'Updated "My case"',
        text: 'Updated the statuses of attached alerts.',
      });
    });

    it('creates the correct toast when the status change, case has alerts, and sync alerts is off', () => {
      // We remove the id as is randomly generated
      const toast = createUpdateSuccessToaster(
        { ...caseBeforeUpdate, settings: { syncAlerts: false } },
        caseAfterUpdate,
        'status',
        'closed'
      );

      expect(toast).toEqual({
        title: 'Updated "My case"',
      });
    });

    it('creates the correct toast when the status change, case does NOT have alerts, and sync alerts is on', () => {
      // We remove the id as is randomly generated
      const toast = createUpdateSuccessToaster(
        { ...caseBeforeUpdate, comments: [] },
        caseAfterUpdate,
        'status',
        'closed'
      );

      expect(toast).toEqual({
        title: 'Updated "My case"',
      });
    });

    it('creates the correct toast if not a status or a setting', () => {
      // We remove the id as is randomly generated
      const toast = createUpdateSuccessToaster(
        caseBeforeUpdate,
        caseAfterUpdate,
        'title',
        'My new title'
      );

      expect(toast).toEqual({
        title: 'Updated "My case"',
      });
    });
  });

  describe('constructAssigneesFilter', () => {
    it('returns an empty object if the array is empty', () => {
      expect(constructAssigneesFilter([])).toEqual({});
    });

    it('returns none if the assignees are null', () => {
      expect(constructAssigneesFilter(null)).toEqual({ assignees: 'none' });
    });

    it('returns none for null values in the assignees array', () => {
      expect(constructAssigneesFilter([null, '123'])).toEqual({ assignees: ['none', '123'] });
    });
  });

  describe('constructReportersFilter', () => {
    it('returns an empty object if the array is empty', () => {
      expect(constructReportersFilter([])).toEqual({});
    });

    it('returns the reporters correctly', () => {
      expect(
        constructReportersFilter([
          { username: 'test', full_name: 'Test', email: 'elastic@elastic.co' },
          {
            username: 'test2',
            full_name: 'Test 2',
            email: 'elastic@elastic.co',
            profile_uid: '123',
          },
        ])
      ).toEqual({ reporters: ['test', '123'] });
    });
  });
});
