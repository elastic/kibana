/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '../../../common';
import {
  Actions,
  ActionTypes,
  CaseStatuses,
  CommentType,
  ConnectorTypes,
} from '../../../common/api';
import { BuilderFactory } from './builder_factory';
import { casePayload, externalService } from './mocks';

describe('UserActionBuilder', () => {
  const builderFactory = new BuilderFactory();
  const commonArgs = {
    caseId: '123',
    user: { full_name: 'Elastic User', username: 'elastic', email: 'elastic@elastic.co' },
    owner: SECURITY_SOLUTION_OWNER,
  };

  beforeAll(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('2022-01-09T22:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('builds a title user action correctly', () => {
    const builder = builderFactory.getBuilder(ActionTypes.title)!;
    const userAction = builder.build({
      payload: { title: 'test' },
      ...commonArgs,
    });

    expect(userAction).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "action": "update",
          "created_at": "2022-01-09T22:00:00.000Z",
          "created_by": Object {
            "email": "elastic@elastic.co",
            "full_name": "Elastic User",
            "username": "elastic",
          },
          "owner": "securitySolution",
          "payload": Object {
            "title": "test",
          },
          "type": "title",
        },
        "references": Array [
          Object {
            "id": "123",
            "name": "associated-cases",
            "type": "cases",
          },
        ],
      }
    `);
  });

  it('builds a connector user action correctly', () => {
    const builder = builderFactory.getBuilder(ActionTypes.connector)!;
    const userAction = builder.build({
      payload: {
        connector: {
          id: '456',
          name: 'ServiceNow SN',
          type: ConnectorTypes.serviceNowSIR,
          fields: {
            category: 'Denial of Service',
            destIp: true,
            malwareHash: true,
            malwareUrl: true,
            priority: '2',
            sourceIp: true,
            subcategory: '45',
          },
        },
      },
      ...commonArgs,
    });

    expect(userAction).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "action": "update",
          "created_at": "2022-01-09T22:00:00.000Z",
          "created_by": Object {
            "email": "elastic@elastic.co",
            "full_name": "Elastic User",
            "username": "elastic",
          },
          "owner": "securitySolution",
          "payload": Object {
            "connector": Object {
              "fields": Object {
                "category": "Denial of Service",
                "destIp": true,
                "malwareHash": true,
                "malwareUrl": true,
                "priority": "2",
                "sourceIp": true,
                "subcategory": "45",
              },
              "name": "ServiceNow SN",
              "type": ".servicenow-sir",
            },
          },
          "type": "connector",
        },
        "references": Array [
          Object {
            "id": "123",
            "name": "associated-cases",
            "type": "cases",
          },
          Object {
            "id": "456",
            "name": "connectorId",
            "type": "action",
          },
        ],
      }
    `);
  });

  it('builds a comment user action correctly', () => {
    const builder = builderFactory.getBuilder(ActionTypes.comment)!;
    const userAction = builder.build({
      action: Actions.update,
      payload: {
        attachment: {
          comment: 'a comment!',
          type: CommentType.user,
          owner: SECURITY_SOLUTION_OWNER,
        },
      },
      attachmentId: 'test-id',
      ...commonArgs,
    });

    expect(userAction).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "action": "update",
          "created_at": "2022-01-09T22:00:00.000Z",
          "created_by": Object {
            "email": "elastic@elastic.co",
            "full_name": "Elastic User",
            "username": "elastic",
          },
          "owner": "securitySolution",
          "payload": Object {
            "comment": Object {
              "comment": "a comment!",
              "owner": "securitySolution",
              "type": "user",
            },
          },
          "type": "comment",
        },
        "references": Array [
          Object {
            "id": "123",
            "name": "associated-cases",
            "type": "cases",
          },
          Object {
            "id": "test-id",
            "name": "associated-cases-comments",
            "type": "cases-comments",
          },
        ],
      }
    `);
  });

  it('builds a description user action correctly', () => {
    const builder = builderFactory.getBuilder(ActionTypes.description)!;
    const userAction = builder.build({
      payload: { description: 'test' },
      ...commonArgs,
    });

    expect(userAction).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "action": "update",
          "created_at": "2022-01-09T22:00:00.000Z",
          "created_by": Object {
            "email": "elastic@elastic.co",
            "full_name": "Elastic User",
            "username": "elastic",
          },
          "owner": "securitySolution",
          "payload": Object {
            "description": "test",
          },
          "type": "description",
        },
        "references": Array [
          Object {
            "id": "123",
            "name": "associated-cases",
            "type": "cases",
          },
        ],
      }
    `);
  });

  it('builds a pushed user action correctly', () => {
    const builder = builderFactory.getBuilder(ActionTypes.pushed)!;
    const userAction = builder.build({
      payload: { externalService },
      ...commonArgs,
    });

    expect(userAction).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "action": "push_to_service",
          "created_at": "2022-01-09T22:00:00.000Z",
          "created_by": Object {
            "email": "elastic@elastic.co",
            "full_name": "Elastic User",
            "username": "elastic",
          },
          "owner": "securitySolution",
          "payload": Object {
            "externalService": Object {
              "connector_name": "ServiceNow SN",
              "external_id": "external-id",
              "external_title": "SIR0010037",
              "external_url": "https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id",
              "pushed_at": "2021-02-03T17:41:26.108Z",
              "pushed_by": Object {
                "email": "elastic@elastic.co",
                "full_name": "Elastic",
                "username": "elastic",
              },
            },
          },
          "type": "pushed",
        },
        "references": Array [
          Object {
            "id": "123",
            "name": "associated-cases",
            "type": "cases",
          },
          Object {
            "id": "456",
            "name": "pushConnectorId",
            "type": "action",
          },
        ],
      }
    `);
  });

  it('builds a tags user action correctly', () => {
    const builder = builderFactory.getBuilder(ActionTypes.tags)!;
    const userAction = builder.build({
      action: Actions.add,
      payload: { tags: ['one', 'two'] },
      ...commonArgs,
    });

    expect(userAction).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "action": "add",
          "created_at": "2022-01-09T22:00:00.000Z",
          "created_by": Object {
            "email": "elastic@elastic.co",
            "full_name": "Elastic User",
            "username": "elastic",
          },
          "owner": "securitySolution",
          "payload": Object {
            "tags": Array [
              "one",
              "two",
            ],
          },
          "type": "tags",
        },
        "references": Array [
          Object {
            "id": "123",
            "name": "associated-cases",
            "type": "cases",
          },
        ],
      }
    `);
  });

  it('builds a status user action correctly', () => {
    const builder = builderFactory.getBuilder(ActionTypes.status)!;
    const userAction = builder.build({
      payload: { status: CaseStatuses.open },
      ...commonArgs,
    });

    expect(userAction).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "action": "update",
          "created_at": "2022-01-09T22:00:00.000Z",
          "created_by": Object {
            "email": "elastic@elastic.co",
            "full_name": "Elastic User",
            "username": "elastic",
          },
          "owner": "securitySolution",
          "payload": Object {
            "status": "open",
          },
          "type": "status",
        },
        "references": Array [
          Object {
            "id": "123",
            "name": "associated-cases",
            "type": "cases",
          },
        ],
      }
    `);
  });

  it('builds a settings user action correctly', () => {
    const builder = builderFactory.getBuilder(ActionTypes.settings)!;
    const userAction = builder.build({
      payload: { settings: { syncAlerts: true } },
      ...commonArgs,
    });

    expect(userAction).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "action": "update",
          "created_at": "2022-01-09T22:00:00.000Z",
          "created_by": Object {
            "email": "elastic@elastic.co",
            "full_name": "Elastic User",
            "username": "elastic",
          },
          "owner": "securitySolution",
          "payload": Object {
            "settings": Object {
              "syncAlerts": true,
            },
          },
          "type": "settings",
        },
        "references": Array [
          Object {
            "id": "123",
            "name": "associated-cases",
            "type": "cases",
          },
        ],
      }
    `);
  });

  it('builds a create case user action correctly', () => {
    const builder = builderFactory.getBuilder(ActionTypes.create_case)!;
    const userAction = builder.build({
      payload: casePayload,
      ...commonArgs,
    });

    expect(userAction).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "action": "create",
          "created_at": "2022-01-09T22:00:00.000Z",
          "created_by": Object {
            "email": "elastic@elastic.co",
            "full_name": "Elastic User",
            "username": "elastic",
          },
          "owner": "securitySolution",
          "payload": Object {
            "connector": Object {
              "fields": Object {
                "category": "Denial of Service",
                "destIp": true,
                "malwareHash": true,
                "malwareUrl": true,
                "priority": "2",
                "sourceIp": true,
                "subcategory": "45",
              },
              "name": "ServiceNow SN",
              "type": ".servicenow-sir",
            },
            "description": "testing sir",
            "owner": "securitySolution",
            "settings": Object {
              "syncAlerts": true,
            },
            "status": "open",
            "tags": Array [
              "sir",
            ],
            "title": "Case SIR",
          },
          "type": "create_case",
        },
        "references": Array [
          Object {
            "id": "123",
            "name": "associated-cases",
            "type": "cases",
          },
          Object {
            "id": "456",
            "name": "connectorId",
            "type": "action",
          },
        ],
      }
    `);
  });

  it('builds a delete case user action correctly', () => {
    const builder = builderFactory.getBuilder(ActionTypes.delete_case)!;
    const userAction = builder.build({
      payload: {},
      connectorId: '456',
      ...commonArgs,
    });

    expect(userAction).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "action": "delete",
          "created_at": "2022-01-09T22:00:00.000Z",
          "created_by": Object {
            "email": "elastic@elastic.co",
            "full_name": "Elastic User",
            "username": "elastic",
          },
          "owner": "securitySolution",
          "payload": Object {},
          "type": "delete_case",
        },
        "references": Array [
          Object {
            "id": "123",
            "name": "associated-cases",
            "type": "cases",
          },
          Object {
            "id": "456",
            "name": "connectorId",
            "type": "action",
          },
        ],
      }
    `);
  });
});
