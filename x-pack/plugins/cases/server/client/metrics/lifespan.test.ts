/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/server';
import { CaseStatuses, CaseUserActionResponse } from '../../../common/api';
import { getStatusInfo } from './lifespan';

describe('lifespan', () => {
  describe('getStatusInfo', () => {
    beforeEach(() => {
      jest.useFakeTimers('modern');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('throws an error when the open date is invalid', () => {
      jest.setSystemTime(new Date(0));

      expect(() => getStatusInfo([], new Date('blah'))).toThrowError('Invalid Date');
    });

    it('sets reopen to 1 when status goes from open -> closed -> open', () => {
      expect(
        getStatusInfo(
          [
            createStatusChangeSavedObject(CaseStatuses.closed, new Date()),
            createStatusChangeSavedObject(CaseStatuses.open, new Date()),
          ],
          new Date(0)
        ).numberOfReopens
      ).toBe(1);
    });

    it('sets reopen to 1 when status goes from open -> closed -> in-progress', () => {
      expect(
        getStatusInfo(
          [
            createStatusChangeSavedObject(CaseStatuses.closed, new Date()),
            createStatusChangeSavedObject(CaseStatuses['in-progress'], new Date()),
          ],
          new Date(0)
        ).numberOfReopens
      ).toBe(1);
    });

    it('does not set reopen to 1 when status goes from open -> closed -> closed', () => {
      expect(
        getStatusInfo(
          [
            createStatusChangeSavedObject(CaseStatuses.closed, new Date()),
            createStatusChangeSavedObject(CaseStatuses.closed, new Date()),
          ],
          new Date(0)
        ).numberOfReopens
      ).toBe(0);
    });

    it('does not set reopen to 1 when status goes from open -> in-progress', () => {
      expect(
        getStatusInfo(
          [createStatusChangeSavedObject(CaseStatuses['in-progress'], new Date())],
          new Date(0)
        ).numberOfReopens
      ).toBe(0);
    });

    it('sets reopen to 2 when status goes from open -> closed -> open twice', () => {
      expect(
        getStatusInfo(
          [
            createStatusChangeSavedObject(CaseStatuses.closed, new Date()),
            createStatusChangeSavedObject(CaseStatuses.open, new Date()),
            createStatusChangeSavedObject(CaseStatuses.closed, new Date()),
            createStatusChangeSavedObject(CaseStatuses.open, new Date()),
          ],
          new Date(0)
        ).numberOfReopens
      ).toBe(2);
    });

    it('sets the openDuration to 1 and inProgressDuration to 0 when open -> close', () => {
      const { inProgressDuration, openDuration } = getStatusInfo(
        [createStatusChangeSavedObject(CaseStatuses.closed, new Date(1))],
        new Date(0)
      );

      expect(openDuration).toBe(1);
      expect(inProgressDuration).toBe(0);
    });

    it('sets the openDuration to 10 when the case has stayed in open', () => {
      jest.setSystemTime(new Date(10));
      const { inProgressDuration, openDuration } = getStatusInfo([], new Date(0));

      expect(openDuration).toBe(10);
      expect(inProgressDuration).toBe(0);
    });

    it('sets the inProgressDuration to 10 when the case has stayed in open', () => {
      jest.setSystemTime(new Date(12));
      const { inProgressDuration, openDuration } = getStatusInfo(
        [createStatusChangeSavedObject(CaseStatuses['in-progress'], new Date(2))],
        new Date(0)
      );

      expect(openDuration).toBe(2);
      expect(inProgressDuration).toBe(10);
    });

    it('ignores non-status user actions with an invalid payload', () => {
      const { numberOfReopens } = getStatusInfo(
        [
          {
            attributes: { payload: { hello: 1, status: CaseStatuses.closed }, type: 'status' },
          } as unknown as SavedObject<CaseUserActionResponse>,
        ],
        new Date(0)
      );

      expect(numberOfReopens).toBe(0);
    });

    it('ignores non-status user actions with an invalid type', () => {
      const { numberOfReopens } = getStatusInfo(
        [
          {
            attributes: { payload: { status: CaseStatuses.closed }, type: 'awesome' },
          } as unknown as SavedObject<CaseUserActionResponse>,
        ],
        new Date(0)
      );

      expect(numberOfReopens).toBe(0);
    });

    it('ignores non-status user actions with an created_at time', () => {
      const { numberOfReopens } = getStatusInfo(
        [
          {
            attributes: {
              payload: { status: CaseStatuses.closed, created_at: 'blah' },
              type: 'status',
            },
          } as unknown as SavedObject<CaseUserActionResponse>,
        ],
        new Date(0)
      );

      expect(numberOfReopens).toBe(0);
    });

    it('does not add the current time to a duration when the case is closed', () => {
      jest.setSystemTime(new Date(12));

      const { openDuration, inProgressDuration } = getStatusInfo(
        [createStatusChangeSavedObject(CaseStatuses.closed, new Date(1))],
        new Date(0)
      );

      expect(openDuration).toBe(1);
      expect(inProgressDuration).toBe(0);
    });
  });
});

function createStatusChangeSavedObject(
  status: CaseStatuses,
  createdAt: Date
): SavedObject<CaseUserActionResponse> {
  return {
    references: [],
    id: '',
    type: '',
    attributes: {
      created_at: createdAt.toISOString(),
      created_by: {
        username: 'j@j.com',
        email: null,
        full_name: null,
      },
      owner: 'securitySolution',
      action: 'update',
      payload: {
        status,
      },
      type: 'status',
      action_id: '',
      case_id: '',
      comment_id: null,
    },
  };
}
