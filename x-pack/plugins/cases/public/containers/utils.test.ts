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
  parseStringAsConnector,
  parseStringAsExternalService,
} from './utils';

import { Case } from './types';
import { ConnectorTypes, noneConnectorId } from '../../common';

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
        text: 'Alerts in this case have been also had their status updated',
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

  describe('parseStringAsConnector', () => {
    it('return undefined if the data is null', () => {
      expect(parseStringAsConnector('', null)).toBeUndefined();
    });

    it('return undefined if the data is not a json object', () => {
      expect(parseStringAsConnector('', 'blah')).toBeUndefined();
    });

    it('return undefined if the data is not a valid connector', () => {
      expect(parseStringAsConnector('', JSON.stringify({ a: '1' }))).toBeUndefined();
    });

    it('return undefined if id is null but the data is a connector other than none', () => {
      expect(
        parseStringAsConnector(
          null,
          JSON.stringify({ type: ConnectorTypes.jira, name: '', fields: null })
        )
      ).toBeUndefined();
    });

    it('return the id as the none connector if the data is the none connector', () => {
      expect(
        parseStringAsConnector(
          null,
          JSON.stringify({ type: ConnectorTypes.none, name: '', fields: null })
        )
      ).toEqual({ id: noneConnectorId, type: ConnectorTypes.none, name: '', fields: null });
    });

    it('returns a decoded connector with the specified id', () => {
      expect(
        parseStringAsConnector(
          'a',
          JSON.stringify({ type: ConnectorTypes.jira, name: 'hi', fields: null })
        )
      ).toEqual({ id: 'a', type: ConnectorTypes.jira, name: 'hi', fields: null });
    });
  });

  describe('parseStringAsExternalService', () => {
    it('returns undefined when the data is null', () => {
      expect(parseStringAsExternalService('', null)).toBeUndefined();
    });

    it('returns undefined when the data is not valid json', () => {
      expect(parseStringAsExternalService('', 'blah')).toBeUndefined();
    });

    it('returns undefined when the data is not a valid external service object', () => {
      expect(parseStringAsExternalService('', JSON.stringify({ a: '1' }))).toBeUndefined();
    });

    it('returns the decoded external service with the connector_id field added', () => {
      const externalServiceInfo = {
        connector_name: 'name',
        external_id: '1',
        external_title: 'title',
        external_url: 'abc',
        pushed_at: '1',
        pushed_by: {
          username: 'a',
          email: 'a@a.com',
          full_name: 'a',
        },
      };

      expect(parseStringAsExternalService('500', JSON.stringify(externalServiceInfo))).toEqual({
        ...externalServiceInfo,
        connector_id: '500',
      });
    });
  });
});
