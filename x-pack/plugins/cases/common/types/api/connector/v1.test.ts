/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConnectorMappingResponseRt,
  FindActionConnectorResponseRt,
  GetCaseConnectorsResponseRt,
} from './v1';

describe('FindActionConnectorResponseRt', () => {
  const response = [
    {
      id: 'test',
      actionTypeId: '.test',
      name: 'My connector',
      isDeprecated: false,
      isPreconfigured: false,
      referencedByCount: 0,
      config: { foo: 'bar' },
      isMissingSecrets: false,
      isSystemAction: false,
    },
    {
      id: 'test-2',
      actionTypeId: '.test',
      name: 'My connector 2',
      isDeprecated: false,
      isPreconfigured: false,
      isSystemAction: false,
      referencedByCount: 0,
    },
  ];

  it('has expected attributes in request', () => {
    const query = FindActionConnectorResponseRt.decode(response);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: response,
    });
  });

  it('removes foo:bar attributes from request', () => {
    const query = FindActionConnectorResponseRt.decode([
      {
        ...response[0],
        foo: 'bar',
      },
    ]);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: [response[0]],
    });
  });
});

describe('GetCaseConnectorsResponseRt', () => {
  const externalService = {
    connector_id: 'servicenow-1',
    connector_name: 'My SN connector',
    external_id: 'external_id',
    external_title: 'external title',
    external_url: 'basicPush.com',
    pushed_at: '2023-01-17T09:46:29.813Z',
    pushed_by: {
      full_name: 'Leslie Knope',
      username: 'lknope',
      email: 'leslie.knope@elastic.co',
    },
  };
  const defaultReq = {
    'servicenow-1': {
      id: 'servicenow-1',
      name: 'My SN connector',
      type: '.servicenow',
      fields: null,
      push: {
        needsToBePushed: false,
        hasBeenPushed: true,
        details: {
          oldestUserActionPushDate: '2023-01-17T09:46:29.813Z',
          latestUserActionPushDate: '2023-01-17T09:46:29.813Z',
          externalService,
        },
      },
    },
  };

  it('has expected attributes in request', () => {
    const query = GetCaseConnectorsResponseRt.decode(defaultReq);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultReq,
    });
  });

  it('removes foo:bar attributes from request', () => {
    const query = GetCaseConnectorsResponseRt.decode({
      'servicenow-1': { ...defaultReq['servicenow-1'], externalService, foo: 'bar' },
    });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultReq,
    });
  });

  it('removes foo:bar attributes from externalService object', () => {
    const query = GetCaseConnectorsResponseRt.decode({
      'servicenow-1': {
        ...defaultReq['servicenow-1'],
        externalService: { ...externalService, foo: 'bar' },
      },
    });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultReq,
    });
  });

  it('removes foo:bar attributes from push object', () => {
    const query = GetCaseConnectorsResponseRt.decode({
      'servicenow-1': {
        ...defaultReq['servicenow-1'],
        push: { ...defaultReq['servicenow-1'].push, foo: 'bar' },
      },
    });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultReq,
    });
  });
});

describe('ConnectorMappingResponseRt', () => {
  const mappings = [
    {
      action_type: 'overwrite',
      source: 'title',
      target: 'unknown',
    },
    {
      action_type: 'append',
      source: 'description',
      target: 'not_mapped',
    },
  ];

  describe('ConnectorMappingResponseRt', () => {
    it('has expected attributes in response', () => {
      const query = ConnectorMappingResponseRt.decode({ id: 'test', version: 'test', mappings });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { id: 'test', version: 'test', mappings },
      });
    });

    it('removes foo:bar attributes from the response', () => {
      const query = ConnectorMappingResponseRt.decode({
        id: 'test',
        version: 'test',
        mappings: [
          { ...mappings[0] },
          {
            action_type: 'append',
            source: 'description',
            target: 'not_mapped',
            foo: 'bar',
          },
        ],
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { id: 'test', version: 'test', mappings },
      });
    });

    it('removes foo:bar attributes from the mappings', () => {
      const query = ConnectorMappingResponseRt.decode({
        id: 'test',
        version: 'test',
        mappings,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { id: 'test', version: 'test', mappings },
      });
    });
  });
});
