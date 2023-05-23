/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../../connectors';
import { ActionTypes } from './common';
import { CreateCaseUserActionRt, CreateCaseUserActionWithoutConnectorIdRt } from './create_case';

describe('Create case', () => {
  describe('CreateCaseUserActionRt', () => {
    const defaultRequest = {
      type: ActionTypes.create_case,
      payload: {
        connector: {
          id: 'jira-connector-id',
          type: ConnectorTypes.jira,
          name: 'jira-connector',
          fields: {
            issueType: 'bug',
            priority: 'high',
            parent: '2',
          },
        },
        assignees: [{ uid: '1' }],
        description: 'sample description',
        status: 'open',
        severity: 'low',
        tags: ['one'],
        title: 'sample title',
        settings: {
          syncAlerts: false,
        },
        owner: 'cases',
      },
    };

    it('has expected attributes in request', () => {
      const query = CreateCaseUserActionRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CreateCaseUserActionRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from payload', () => {
      const query = CreateCaseUserActionRt.decode({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CreateCaseUserActionWithoutConnectorIdRt', () => {
    const defaultRequest = {
      type: ActionTypes.create_case,
      payload: {
        connector: {
          type: ConnectorTypes.jira,
          name: 'jira-connector',
          fields: {
            issueType: 'bug',
            priority: 'high',
            parent: '2',
          },
        },
        assignees: [{ uid: '1' }],
        description: 'sample description',
        status: 'open',
        severity: 'low',
        tags: ['one'],
        title: 'sample title',
        settings: {
          syncAlerts: false,
        },
        owner: 'cases',
      },
    };

    it('has expected attributes in request', () => {
      const query = CreateCaseUserActionWithoutConnectorIdRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CreateCaseUserActionWithoutConnectorIdRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from payload', () => {
      const query = CreateCaseUserActionWithoutConnectorIdRt.decode({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
