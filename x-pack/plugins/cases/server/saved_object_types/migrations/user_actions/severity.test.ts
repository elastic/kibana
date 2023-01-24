/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypes } from '../../../../common/api';
import { CASE_USER_ACTION_SAVED_OBJECT } from '../../../../common/constants';
import { addSeverityToCreateUserAction } from './severity';

describe('severity migration', () => {
  const userAction = {
    type: CASE_USER_ACTION_SAVED_OBJECT,
    id: '1',
    attributes: {
      action_at: '2022-01-09T22:00:00.000Z',
      action_by: {
        email: 'elastic@elastic.co',
        full_name: 'Elastic User',
        username: 'elastic',
      },
      payload: {},
      type: ActionTypes.create_case,
    },
  };

  it('adds the severity field to the create_case user action', () => {
    // @ts-expect-error
    const migratedUserAction = addSeverityToCreateUserAction(userAction);
    expect(migratedUserAction).toEqual({
      attributes: {
        action_at: '2022-01-09T22:00:00.000Z',
        action_by: {
          email: 'elastic@elastic.co',
          full_name: 'Elastic User',
          username: 'elastic',
        },
        payload: {
          severity: 'low',
        },
        type: 'create_case',
      },
      id: '1',
      references: [],
      type: 'cases-user-actions',
    });
  });

  it('does NOT add the severity field to the create_case user action', () => {
    Object.keys(ActionTypes)
      .filter((type) => type !== ActionTypes.create_case)
      .forEach((type) => {
        const migratedUserAction = addSeverityToCreateUserAction({
          ...userAction,
          // @ts-expect-error
          attributes: { ...userAction.attributes, type },
        });
        expect(migratedUserAction).toEqual({
          attributes: {
            action_at: '2022-01-09T22:00:00.000Z',
            action_by: {
              email: 'elastic@elastic.co',
              full_name: 'Elastic User',
              username: 'elastic',
            },
            payload: {},
            type,
          },
          id: '1',
          references: [],
          type: 'cases-user-actions',
        });
      });
  });
});
