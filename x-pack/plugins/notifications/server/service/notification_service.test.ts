/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, Field } from './action';
import { NotificationService } from './notification_service';

class TestAction extends Action {
  constructor({ server, id }: { server: any; id: string }) {
    super({ server, id, name: 'TestAction' });
  }

  public getMissingFields(data: any): Field[] {
    return [];
  }
}

// always returns a missing field
// tslint:disable-next-line: max-classes-per-file
class MissingFieldTestAction extends Action {
  constructor({ server, id }: { server: any; id: string }) {
    super({ server, id, name: 'MissingFieldTestAction' });
  }

  public getMissingFields(data: any): Field[] {
    return [{ field: 'subject', name: 'Subject', type: 'text' }];
  }
}

describe('NotificationService', () => {
  const server = {};
  const actionId = 'notifications-test';
  const action = new TestAction({ server, id: actionId });

  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
  });

  test('initializes with no default actions', () => {
    expect(notificationService.getActionsForData()).toEqual([]);
  });

  describe('setAction', () => {
    test('adds the action', () => {
      notificationService.setAction(action);

      expect(notificationService.getActionForId(actionId)).toBe(action);
    });

    test('removes any action with the same ID first, then adds the action', () => {
      notificationService.setAction(new TestAction({ server: {}, id: actionId }));
      notificationService.setAction(action);

      expect(notificationService.getActionsForData()).toHaveLength(1);
      expect(notificationService.getActionsForData()[0]).toBe(action);
    });
  });

  describe('removeAction', () => {
    test('returns null if the action does not exist', () => {
      expect(notificationService.removeAction(actionId)).toBe(undefined);

      notificationService.setAction(action);

      expect(notificationService.removeAction('not-' + actionId)).toBe(undefined);
      expect(notificationService.getActionsForData()[0]).toBe(action);
    });

    test('returns the removed action', () => {
      notificationService.setAction(action);

      expect(notificationService.removeAction(actionId)).toBe(action);
      expect(notificationService.getActionsForData()).toEqual([]);
    });
  });

  describe('getActionForId', () => {
    test('returns null if the action does not exist', () => {
      expect(notificationService.getActionForId(actionId)).toBe(undefined);

      notificationService.setAction(action);

      expect(notificationService.getActionForId('not-' + actionId)).toBe(undefined);
      expect(notificationService.getActionsForData()[0]).toBe(action);
    });

    test('returns the action', () => {
      notificationService.setAction(action);

      expect(notificationService.getActionForId(actionId)).toBe(action);
      expect(notificationService.getActionsForData()[0]).toBe(action);
    });
  });

  describe('getActionsForData', () => {
    test('returns [] if no corresponding action exists', () => {
      expect(notificationService.getActionsForData({})).toEqual([]);

      notificationService.setAction(new MissingFieldTestAction({ server, id: 'always-missing' }));

      expect(notificationService.getActionsForData({})).toEqual([]);
      expect(notificationService.getActionsForData()).toHaveLength(0);
    });

    test('returns the actions that match', () => {
      notificationService.setAction(action);

      expect(notificationService.getActionsForData({})).toEqual([action]);
      expect(notificationService.getActionsForData()[0]).toBe(action);

      const otherActionId = 'other-' + actionId;

      notificationService.setAction(new MissingFieldTestAction({ server, id: 'always-missing' }));
      notificationService.setAction(new TestAction({ server, id: otherActionId }));

      const actions = notificationService.getActionsForData({});

      expect(actions.map(a => a.getId())).toEqual([actionId, otherActionId]);
    });
  });
});
