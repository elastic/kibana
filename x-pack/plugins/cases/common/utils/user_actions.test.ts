/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { ActionTypes } from '../api';
import {
  isConnectorUserAction,
  isTitleUserAction,
  isStatusUserAction,
  isTagsUserAction,
  isCommentUserAction,
  isDescriptionUserAction,
  isPushedUserAction,
  isCreateCaseUserAction,
  isUserActionType,
} from './user_actions';

describe('user action utils', () => {
  const predicateMap = {
    [ActionTypes.connector]: isConnectorUserAction,
    [ActionTypes.title]: isTitleUserAction,
    [ActionTypes.status]: isStatusUserAction,
    [ActionTypes.tags]: isTagsUserAction,
    [ActionTypes.comment]: isCommentUserAction,
    [ActionTypes.description]: isDescriptionUserAction,
  };

  const tests = (Object.keys(predicateMap) as Array<keyof typeof predicateMap>).map((key) => [key]);

  describe.each(tests)('%s', (type) => {
    it('returns true if the user action is %s', () => {
      const predicate = predicateMap[type];
      expect(predicate({ type, payload: { [type]: {} } })).toBe(true);
    });

    it('returns false if the type is wrong', () => {
      const predicate = predicateMap[type];
      expect(predicate({ type: 'not-exist', payload: { connector: {} } })).toBe(false);
    });

    it('returns false if the payload is wrong', () => {
      const predicate = predicateMap[type];
      expect(predicate({ type: 'not-exist', payload: {} })).toBe(false);
    });
  });

  describe('isPushedUserAction', () => {
    it('returns true if the user action is pushed', () => {
      expect(
        isPushedUserAction({ type: ActionTypes.pushed, payload: { externalService: {} } })
      ).toBe(true);
    });

    it('returns false if the type is wrong', () => {
      expect(isPushedUserAction({ type: 'not-exist', payload: { connector: {} } })).toBe(false);
    });

    it('returns false if the payload is wrong', () => {
      expect(isPushedUserAction({ type: 'not-exist', payload: {} })).toBe(false);
    });
  });

  describe('isCreateCaseUserAction', () => {
    const payloadTests = [...Object.keys(predicateMap), ['settings'], ['owner']];

    const payload = {
      connector: {},
      title: '',
      description: '',
      tags: [],
      settings: {},
      status: '',
      owner: '',
    };

    it('returns true if the user action is create_case', () => {
      expect(
        isCreateCaseUserAction({
          type: ActionTypes.create_case,
          payload,
        })
      ).toBe(true);
    });

    it('returns false if the type is wrong', () => {
      expect(isCreateCaseUserAction({ type: 'not-exist' })).toBe(false);
    });

    it.each(payloadTests)('returns false if the payload is missing %s', (field) => {
      const wrongPayload = omit(payload, field);
      expect(isPushedUserAction({ type: 'not-exist', payload: wrongPayload })).toBe(false);
    });
  });

  describe('isUserActionType', () => {
    const actionTypesTests = Object.keys(predicateMap).map((key) => [key]);

    it.each(actionTypesTests)('returns true if it is a user action type is %s', (type) => {
      expect(isUserActionType(type)).toBe(true);
    });

    it('returns false if the type is not a user action type', () => {
      expect(isCreateCaseUserAction('not-exist')).toBe(false);
    });
  });
});
