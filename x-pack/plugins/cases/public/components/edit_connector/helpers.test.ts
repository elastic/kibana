/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseUserActions } from '../../containers/types';
import { getConnectorFieldsFromUserActions } from './helpers';

describe('helpers', () => {
  describe('getConnectorFieldsFromUserActions', () => {
    it('returns null when it cannot find the connector id', () => {
      expect(getConnectorFieldsFromUserActions('a', [])).toBeNull();
    });

    it('returns null when an error is thrown', () => {
      expect(
        getConnectorFieldsFromUserActions('a', [createUserAction({ newValue: 'a', oldValue: 'a' })])
      ).toBeNull();
    });

    it('returns null when it cannot find the connector id in a non empty array', () => {
      expect(
        getConnectorFieldsFromUserActions('a', [
          createUserAction({
            newValue: JSON.stringify({ a: '1' }),
            oldValue: JSON.stringify({ a: '1' }),
          }),
        ])
      ).toBeNull();
    });

    it('returns the fields when it finds the connector id in the new value', () => {
      expect(
        getConnectorFieldsFromUserActions('a', [
          createUserAction({
            newValue: JSON.stringify({ a: '1', fields: { hello: '1' } }),
            oldValue: JSON.stringify({ a: '1' }),
            newValConnectorId: 'a',
          }),
        ])
      ).toEqual({ hello: '1' });
    });

    it('returns the fields when it finds the connector id in the new value and the old value is null', () => {
      expect(
        getConnectorFieldsFromUserActions('a', [
          createUserAction({
            newValue: JSON.stringify({ a: '1', fields: { hello: '1' } }),
            newValConnectorId: 'a',
          }),
        ])
      ).toEqual({ hello: '1' });
    });

    it('returns the fields when it finds the connector id in the old value', () => {
      expect(
        getConnectorFieldsFromUserActions('id-to-find', [
          createUserAction({
            newValue: JSON.stringify({ a: '1', fields: { hello: '1' } }),
            oldValue: JSON.stringify({ a: '1', fields: { hi: '2' } }),
            newValConnectorId: 'b',
            oldValConnectorId: 'id-to-find',
          }),
        ])
      ).toEqual({ hi: '2' });
    });

    it('returns the fields when it finds the connector id in the second user action', () => {
      expect(
        getConnectorFieldsFromUserActions('id-to-find', [
          createUserAction({
            newValue: JSON.stringify({ a: '1', fields: { hello: '1' } }),
            oldValue: JSON.stringify({ a: '1', fields: { hi: '2' } }),
            newValConnectorId: 'b',
            oldValConnectorId: 'a',
          }),
          createUserAction({
            newValue: JSON.stringify({ a: '1', fields: { hello: '1' } }),
            oldValue: JSON.stringify({ a: '1', fields: { hi: '2' } }),
            newValConnectorId: 'b',
            oldValConnectorId: 'id-to-find',
          }),
        ])
      ).toEqual({ hi: '2' });
    });

    it('ignores a parse failure and finds the right user action', () => {
      expect(
        getConnectorFieldsFromUserActions('none', [
          createUserAction({
            newValue: 'b',
            newValConnectorId: null,
          }),
          createUserAction({
            newValue: JSON.stringify({ type: '.none', fields: { hello: '1' } }),
            newValConnectorId: null,
          }),
        ])
      ).toEqual({ hello: '1' });
    });

    it('returns null when the id matches but the encoded value is null', () => {
      expect(
        getConnectorFieldsFromUserActions('b', [
          createUserAction({
            newValue: null,
            newValConnectorId: 'b',
          }),
        ])
      ).toBeNull();
    });

    it('returns null when the action fields is not of length 1', () => {
      expect(
        getConnectorFieldsFromUserActions('id-to-find', [
          createUserAction({
            newValue: JSON.stringify({ a: '1', fields: { hello: '1' } }),
            oldValue: JSON.stringify({ a: '1', fields: { hi: '2' } }),
            newValConnectorId: 'b',
            oldValConnectorId: 'id-to-find',
            actionField: ['connector', 'connector'],
          }),
        ])
      ).toBeNull();
    });

    it('matches the none connector the searched for id is none', () => {
      expect(
        getConnectorFieldsFromUserActions('none', [
          createUserAction({
            newValue: JSON.stringify({ type: '.none', fields: { hello: '1' } }),
            newValConnectorId: null,
          }),
        ])
      ).toEqual({ hello: '1' });
    });
  });
});

function createUserAction(fields: Partial<CaseUserActions>): CaseUserActions {
  return {
    action: 'update',
    actionAt: '',
    actionBy: {},
    actionField: ['connector'],
    actionId: '',
    caseId: '',
    commentId: '',
    newValConnectorId: null,
    oldValConnectorId: null,
    newValue: null,
    oldValue: null,
    ...fields,
  };
}
