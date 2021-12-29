/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions, ConnectorTypes, ConnectorUserAction } from '../../../common/api';
import { CaseUserActions } from '../../containers/types';
import { getConnectorFieldsFromUserActions } from './helpers';

const defaultJiraFields = {
  issueType: '1',
  parent: null,
  priority: null,
};

describe('helpers', () => {
  describe('getConnectorFieldsFromUserActions', () => {
    it('returns null when it cannot find the connector id', () => {
      expect(getConnectorFieldsFromUserActions('a', [])).toBeNull();
    });

    it('returns null when it cannot find the connector id in a non empty array', () => {
      expect(
        getConnectorFieldsFromUserActions('a', [
          createConnectorUserAction({
            // @ts-expect-error payload missing fields
            payload: { a: '1' },
          }),
        ])
      ).toBeNull();
    });

    it('returns the fields when it finds the connector id', () => {
      expect(getConnectorFieldsFromUserActions('a', [createConnectorUserAction()])).toEqual(
        defaultJiraFields
      );
    });

    it('returns the fields when it finds the connector id in the second user action', () => {
      const expectedFields = { ...defaultJiraFields, issueType: '5' };

      expect(
        getConnectorFieldsFromUserActions('id-to-find', [
          createConnectorUserAction({}),
          createConnectorUserAction({
            payload: {
              connector: {
                id: 'id-to-find',
                name: 'test',
                fields: expectedFields,
                type: ConnectorTypes.jira,
              },
            },
          }),
        ])
      ).toEqual(expectedFields);
    });

    it('returns null when the action is not a connector', () => {
      expect(
        getConnectorFieldsFromUserActions('id-to-find', [
          createConnectorUserAction({
            // @ts-expect-error
            type: 'not-a-connector',
          }),
        ])
      ).toBeNull();
    });
  });
});

function createConnectorUserAction(attributes: Partial<ConnectorUserAction> = {}): CaseUserActions {
  return {
    action: Actions.update,
    createdBy: { username: 'user', fullName: null, email: null },
    createdAt: '2021-12-08T11:28:32.623Z',
    type: 'connector',
    actionId: '',
    caseId: '',
    commentId: '',
    payload: {
      connector: { id: 'a', name: 'test', fields: defaultJiraFields, type: ConnectorTypes.jira },
    },
    ...attributes,
  } as CaseUserActions;
}
