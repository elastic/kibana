/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isString } from 'lodash';
import sinon from 'sinon';
import { buildPrivilegeMap } from './privileges';

describe('privileges should be tiered', () => {
  const subject = buildPrivilegeMap;

  it('should produce an object of the expected form', () => {
    const getSavedObjectAction = sinon.fake((t, a) => {
      if (!t || !isString(t)) {
        throw new Error('type is required and must be a string');
      }

      if (!a || !isString(a)) {
        throw new Error('action is required and must be a string');
      }

      return `action:saved_objects/${t}/${a}`;
    });
    const privMap = subject(['someTypes'], {
      getSavedObjectAction,
      version: 'testVersion',
      login: 'test:login',
      manageSpaces: 'manageSpaces',
    });
    expect(privMap).toMatchObject({
      global: {
        all: [
          'testVersion',
          'test:login',
          'manageSpaces',
          'action:saved_objects/someTypes/create',
          'action:saved_objects/someTypes/bulk_create',
          'action:saved_objects/someTypes/delete',
          'action:saved_objects/someTypes/get',
          'action:saved_objects/someTypes/bulk_get',
          'action:saved_objects/someTypes/find',
          'action:saved_objects/someTypes/update',
        ],
        read: [
          'testVersion',
          'test:login',
          'action:saved_objects/someTypes/get',
          'action:saved_objects/someTypes/bulk_get',
          'action:saved_objects/someTypes/find',
        ],
      },
      space: {
        all: [
          'testVersion',
          'test:login',
          'action:saved_objects/someTypes/create',
          'action:saved_objects/someTypes/bulk_create',
          'action:saved_objects/someTypes/delete',
          'action:saved_objects/someTypes/get',
          'action:saved_objects/someTypes/bulk_get',
          'action:saved_objects/someTypes/find',
          'action:saved_objects/someTypes/update',
        ],
        read: [
          'testVersion',
          'test:login',
          'action:saved_objects/someTypes/get',
          'action:saved_objects/someTypes/bulk_get',
          'action:saved_objects/someTypes/find',
        ],
      },
    });
  });
});
