/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noneConnectorId } from '../../../common/api';
import {
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
  USER_ACTION_OLD_ID_REF_NAME,
  USER_ACTION_OLD_PUSH_ID_REF_NAME,
} from '../../common/constants';
import { getNoneCaseConnector } from '../../common/utils';
import { createConnectorObject, createExternalService, createJiraConnector } from '../test_utils';
import {
  extractConnectorIdHelper,
  extractConnectorIdFromJson,
  extractConnectorId,
  transformConnectorIdToReference,
  transformPushConnectorIdToReference,
} from './transform';
import { UserActionFieldType } from './types';

describe('user action transform utils', () => {
  describe('transformConnectorIdToReference', () => {
    it('returns the default none connector when the connector is undefined', () => {
      expect(transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME).transformedConnector)
        .toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": null,
            "name": "none",
            "type": ".none",
          },
        }
      `);
    });

    it('returns the default none connector when the id is undefined', () => {
      expect(
        transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME, { id: undefined })
          .transformedConnector
      ).toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": null,
            "name": "none",
            "type": ".none",
          },
        }
      `);
    });

    it('returns the default none connector when the id is none', () => {
      expect(
        transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME, { id: noneConnectorId })
          .transformedConnector
      ).toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": null,
            "name": "none",
            "type": ".none",
          },
        }
      `);
    });

    it('returns the default none connector when the id is none and other fields are defined', () => {
      expect(
        transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME, {
          ...createJiraConnector(),
          id: noneConnectorId,
        }).transformedConnector
      ).toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": null,
            "name": "none",
            "type": ".none",
          },
        }
      `);
    });

    it('returns an empty array of references when the connector is undefined', () => {
      expect(transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME).references.length).toBe(
        0
      );
    });

    it('returns an empty array of references when the id is undefined', () => {
      expect(
        transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME, { id: undefined }).references
          .length
      ).toBe(0);
    });

    it('returns an empty array of references when the id is the none connector', () => {
      expect(
        transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME, { id: noneConnectorId })
          .references.length
      ).toBe(0);
    });

    it('returns an empty array of references when the id is the none connector and other fields are defined', () => {
      expect(
        transformConnectorIdToReference(CONNECTOR_ID_REFERENCE_NAME, {
          ...createJiraConnector(),
          id: noneConnectorId,
        }).references.length
      ).toBe(0);
    });

    it('returns a jira connector', () => {
      const transformedFields = transformConnectorIdToReference(
        CONNECTOR_ID_REFERENCE_NAME,
        createJiraConnector()
      );
      expect(transformedFields.transformedConnector).toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": Object {
              "issueType": "bug",
              "parent": "2",
              "priority": "high",
            },
            "name": ".jira",
            "type": ".jira",
          },
        }
      `);
      expect(transformedFields.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "1",
            "name": "connectorId",
            "type": "action",
          },
        ]
      `);
    });

    it('returns a jira connector with the user action reference name', () => {
      const transformedFields = transformConnectorIdToReference(
        USER_ACTION_OLD_ID_REF_NAME,
        createJiraConnector()
      );
      expect(transformedFields.transformedConnector).toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": Object {
              "issueType": "bug",
              "parent": "2",
              "priority": "high",
            },
            "name": ".jira",
            "type": ".jira",
          },
        }
      `);
      expect(transformedFields.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "1",
            "name": "oldConnectorId",
            "type": "action",
          },
        ]
      `);
    });
  });

  describe('transformPushConnectorIdToReference', () => {
    it('sets external_service to null when it is undefined', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME)
          .transformedPushConnector
      ).toMatchInlineSnapshot(`
        Object {
          "external_service": null,
        }
      `);
    });

    it('sets external_service to null when it is null', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, null)
          .transformedPushConnector
      ).toMatchInlineSnapshot(`
        Object {
          "external_service": null,
        }
      `);
    });

    it('returns an object when external_service is defined but connector_id is undefined', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, {
          connector_id: undefined,
        }).transformedPushConnector
      ).toMatchInlineSnapshot(`
        Object {
          "external_service": Object {},
        }
      `);
    });

    it('returns an object when external_service is defined but connector_id is null', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, {
          connector_id: null,
        }).transformedPushConnector
      ).toMatchInlineSnapshot(`
        Object {
          "external_service": Object {},
        }
      `);
    });

    it('returns an object when external_service is defined but connector_id is none', () => {
      const otherFields = { otherField: 'hi' };

      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, {
          ...otherFields,
          connector_id: noneConnectorId,
        }).transformedPushConnector
      ).toMatchInlineSnapshot(`
        Object {
          "external_service": Object {
            "otherField": "hi",
          },
        }
      `);
    });

    it('returns an empty array of references when the external_service is undefined', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME).references.length
      ).toBe(0);
    });

    it('returns an empty array of references when the external_service is null', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, null).references
          .length
      ).toBe(0);
    });

    it('returns an empty array of references when the connector_id is undefined', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, {
          connector_id: undefined,
        }).references.length
      ).toBe(0);
    });

    it('returns an empty array of references when the connector_id is null', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, {
          connector_id: undefined,
        }).references.length
      ).toBe(0);
    });

    it('returns an empty array of references when the connector_id is the none connector', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, {
          connector_id: noneConnectorId,
        }).references.length
      ).toBe(0);
    });

    it('returns an empty array of references when the connector_id is the none connector and other fields are defined', () => {
      expect(
        transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, {
          ...createExternalService(),
          connector_id: noneConnectorId,
        }).references.length
      ).toBe(0);
    });

    it('returns the external_service connector', () => {
      const transformedFields = transformPushConnectorIdToReference(
        PUSH_CONNECTOR_ID_REFERENCE_NAME,
        createExternalService()
      );
      expect(transformedFields.transformedPushConnector).toMatchInlineSnapshot(`
        Object {
          "external_service": Object {
            "connector_name": ".jira",
            "external_id": "100",
            "external_title": "awesome",
            "external_url": "http://www.google.com",
            "pushed_at": "2019-11-25T21:54:48.952Z",
            "pushed_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
          },
        }
      `);
      expect(transformedFields.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "100",
            "name": "pushConnectorId",
            "type": "action",
          },
        ]
      `);
    });

    it('returns the external_service connector with a user actions reference name', () => {
      const transformedFields = transformPushConnectorIdToReference(
        USER_ACTION_OLD_PUSH_ID_REF_NAME,
        createExternalService()
      );

      expect(transformedFields.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "100",
            "name": "oldPushConnectorId",
            "type": "action",
          },
        ]
      `);
    });
  });

  describe('extractConnectorIdHelper', () => {
    it('throws an error when action details has a circular reference', () => {
      const circularRef = { prop: {} };
      circularRef.prop = circularRef;

      expect(() => {
        extractConnectorIdHelper({
          action: 'a',
          actionFields: [],
          actionDetails: circularRef,
          fieldType: UserActionFieldType.New,
        });
      }).toThrow();
    });

    describe('create action', () => {
      it('returns no references and untransformed json when actionDetails is not a valid connector', () => {
        expect(
          extractConnectorIdHelper({
            action: 'create',
            actionFields: ['connector'],
            actionDetails: { a: 'hello' },
            fieldType: UserActionFieldType.New,
          })
        ).toMatchInlineSnapshot(`
          Object {
            "references": Array [],
            "transformedActionDetails": "{\\"a\\":\\"hello\\"}",
          }
        `);
      });

      it('returns no references and untransformed json when the action is create and action fields does not contain connector', () => {
        expect(
          extractConnectorIdHelper({
            action: 'create',
            actionFields: ['', 'something', 'onnector'],
            actionDetails: { a: 'hello' },
            fieldType: UserActionFieldType.New,
          })
        ).toMatchInlineSnapshot(`
          Object {
            "references": Array [],
            "transformedActionDetails": "{\\"a\\":\\"hello\\"}",
          }
        `);
      });

      it('returns the stringified json without the id', () => {
        const jiraConnector = createConnectorObject();

        const { transformedActionDetails } = extractConnectorIdHelper({
          action: 'create',
          actionFields: ['connector'],
          actionDetails: jiraConnector,
          fieldType: UserActionFieldType.New,
        });

        expect(JSON.parse(transformedActionDetails)).toMatchInlineSnapshot(`
          Object {
            "connector": Object {
              "fields": Object {
                "issueType": "bug",
                "parent": "2",
                "priority": "high",
              },
              "name": ".jira",
              "type": ".jira",
            },
          }
        `);
      });

      it('removes the connector.id when the connector is none', () => {
        const connector = { connector: getNoneCaseConnector() };

        const { transformedActionDetails } = extractConnectorIdHelper({
          action: 'create',
          actionFields: ['connector'],
          actionDetails: connector,
          fieldType: UserActionFieldType.New,
        })!;

        const parsedJson = JSON.parse(transformedActionDetails);

        expect(parsedJson.connector).not.toHaveProperty('id');
        expect(parsedJson).toMatchInlineSnapshot(`
          Object {
            "connector": Object {
              "fields": null,
              "name": "none",
              "type": ".none",
            },
          }
        `);
      });

      it('does not return a reference when the connector is none', () => {
        const connector = { connector: getNoneCaseConnector() };

        const { references } = extractConnectorIdHelper({
          action: 'create',
          actionFields: ['connector'],
          actionDetails: connector,
          fieldType: UserActionFieldType.New,
        })!;

        expect(references).toEqual([]);
      });

      it('returns a reference to the connector.id', () => {
        const connector = createConnectorObject();

        const { references } = extractConnectorIdHelper({
          action: 'create',
          actionFields: ['connector'],
          actionDetails: connector,
          fieldType: UserActionFieldType.New,
        })!;

        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "1",
              "name": "connectorId",
              "type": "action",
            },
          ]
        `);
      });

      it('returns an old reference name to the connector.id', () => {
        const connector = createConnectorObject();

        const { references } = extractConnectorIdHelper({
          action: 'create',
          actionFields: ['connector'],
          actionDetails: connector,
          fieldType: UserActionFieldType.Old,
        })!;

        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "1",
              "name": "oldConnectorId",
              "type": "action",
            },
          ]
        `);
      });

      it('returns the transformed connector and the description', () => {
        const details = { ...createConnectorObject(), description: 'a description' };

        const { transformedActionDetails } = extractConnectorIdHelper({
          action: 'create',
          actionFields: ['connector'],
          actionDetails: details,
          fieldType: UserActionFieldType.Old,
        })!;

        const parsedJson = JSON.parse(transformedActionDetails);

        expect(parsedJson).toMatchInlineSnapshot(`
          Object {
            "connector": Object {
              "fields": Object {
                "issueType": "bug",
                "parent": "2",
                "priority": "high",
              },
              "name": ".jira",
              "type": ".jira",
            },
            "description": "a description",
          }
        `);
      });
    });

    describe('update action', () => {
      it('returns no references and untransformed json when actionDetails is not a valid connector', () => {
        expect(
          extractConnectorIdHelper({
            action: 'update',
            actionFields: ['connector'],
            actionDetails: { a: 'hello' },
            fieldType: UserActionFieldType.New,
          })
        ).toMatchInlineSnapshot(`
          Object {
            "references": Array [],
            "transformedActionDetails": "{\\"a\\":\\"hello\\"}",
          }
        `);
      });

      it('returns no references and untransformed json when the action is update and action fields does not contain connector', () => {
        expect(
          extractConnectorIdHelper({
            action: 'update',
            actionFields: ['', 'something', 'onnector'],
            actionDetails: 5,
            fieldType: UserActionFieldType.New,
          })
        ).toMatchInlineSnapshot(`
          Object {
            "references": Array [],
            "transformedActionDetails": "5",
          }
        `);
      });

      it('returns the stringified json without the id', () => {
        const jiraConnector = createJiraConnector();

        const { transformedActionDetails } = extractConnectorIdHelper({
          action: 'update',
          actionFields: ['connector'],
          actionDetails: jiraConnector,
          fieldType: UserActionFieldType.New,
        });

        const transformedConnetor = JSON.parse(transformedActionDetails!);
        expect(transformedConnetor).not.toHaveProperty('id');
        expect(transformedConnetor).toMatchInlineSnapshot(`
          Object {
            "fields": Object {
              "issueType": "bug",
              "parent": "2",
              "priority": "high",
            },
            "name": ".jira",
            "type": ".jira",
          }
        `);
      });

      it('returns the stringified json without the id when the connector is none', () => {
        const connector = getNoneCaseConnector();

        const { transformedActionDetails } = extractConnectorIdHelper({
          action: 'update',
          actionFields: ['connector'],
          actionDetails: connector,
          fieldType: UserActionFieldType.New,
        });

        const transformedConnetor = JSON.parse(transformedActionDetails);
        expect(transformedConnetor).not.toHaveProperty('id');
        expect(transformedConnetor).toMatchInlineSnapshot(`
          Object {
            "fields": null,
            "name": "none",
            "type": ".none",
          }
        `);
      });

      it('returns a reference to the connector.id', () => {
        const jiraConnector = createJiraConnector();

        const { references } = extractConnectorIdHelper({
          action: 'update',
          actionFields: ['connector'],
          actionDetails: jiraConnector,
          fieldType: UserActionFieldType.New,
        })!;

        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "1",
              "name": "connectorId",
              "type": "action",
            },
          ]
        `);
      });

      it('does not return a reference when the connector is none', () => {
        const connector = getNoneCaseConnector();

        const { references } = extractConnectorIdHelper({
          action: 'update',
          actionFields: ['connector'],
          actionDetails: connector,
          fieldType: UserActionFieldType.New,
        })!;

        expect(references).toEqual([]);
      });

      it('returns an old reference name to the connector.id', () => {
        const jiraConnector = createJiraConnector();

        const { references } = extractConnectorIdHelper({
          action: 'update',
          actionFields: ['connector'],
          actionDetails: jiraConnector,
          fieldType: UserActionFieldType.Old,
        })!;

        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "1",
              "name": "oldConnectorId",
              "type": "action",
            },
          ]
        `);
      });
    });

    describe('push action', () => {
      it('returns no references and untransformed json when actionDetails is not a valid external_service', () => {
        expect(
          extractConnectorIdHelper({
            action: 'push-to-service',
            actionFields: ['pushed'],
            actionDetails: { a: 'hello' },
            fieldType: UserActionFieldType.New,
          })
        ).toMatchInlineSnapshot(`
          Object {
            "references": Array [],
            "transformedActionDetails": "{\\"a\\":\\"hello\\"}",
          }
        `);
      });

      it('returns no references and untransformed json when the action is push-to-service and action fields does not contain pushed', () => {
        expect(
          extractConnectorIdHelper({
            action: 'push-to-service',
            actionFields: ['', 'something', 'ushed'],
            actionDetails: { a: 'hello' },
            fieldType: UserActionFieldType.New,
          })
        ).toMatchInlineSnapshot(`
          Object {
            "references": Array [],
            "transformedActionDetails": "{\\"a\\":\\"hello\\"}",
          }
        `);
      });

      it('returns the stringified json without the connector_id', () => {
        const externalService = createExternalService();

        const { transformedActionDetails } = extractConnectorIdHelper({
          action: 'push-to-service',
          actionFields: ['pushed'],
          actionDetails: externalService,
          fieldType: UserActionFieldType.New,
        });

        const transformedExternalService = JSON.parse(transformedActionDetails);
        expect(transformedExternalService).not.toHaveProperty('connector_id');
        expect(transformedExternalService).toMatchInlineSnapshot(`
          Object {
            "connector_name": ".jira",
            "external_id": "100",
            "external_title": "awesome",
            "external_url": "http://www.google.com",
            "pushed_at": "2019-11-25T21:54:48.952Z",
            "pushed_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
          }
        `);
      });

      it('returns a reference to the connector_id', () => {
        const externalService = createExternalService();

        const { references } = extractConnectorIdHelper({
          action: 'push-to-service',
          actionFields: ['pushed'],
          actionDetails: externalService,
          fieldType: UserActionFieldType.New,
        })!;

        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "100",
              "name": "pushConnectorId",
              "type": "action",
            },
          ]
        `);
      });

      it('returns an old reference name to the connector_id', () => {
        const externalService = createExternalService();

        const { references } = extractConnectorIdHelper({
          action: 'push-to-service',
          actionFields: ['pushed'],
          actionDetails: externalService,
          fieldType: UserActionFieldType.Old,
        })!;

        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "100",
              "name": "oldPushConnectorId",
              "type": "action",
            },
          ]
        `);
      });
    });
  });

  describe('extractConnectorId', () => {
    it('returns null when the action details has a circular reference', () => {
      const circularRef = { prop: {} };
      circularRef.prop = circularRef;

      const { transformedActionDetails, references } = extractConnectorId({
        action: 'a',
        actionFields: ['a'],
        actionDetails: circularRef,
        fieldType: UserActionFieldType.New,
      });

      expect(transformedActionDetails).toBeNull();
      expect(references).toEqual([]);
    });

    describe('fails to extract the id', () => {
      it('returns a null transformed action details when it is initially null', () => {
        const { transformedActionDetails, references } = extractConnectorId({
          action: 'a',
          actionFields: ['a'],
          actionDetails: null,
          fieldType: UserActionFieldType.New,
        });

        expect(transformedActionDetails).toBeNull();
        expect(references).toEqual([]);
      });

      it('returns an undefined transformed action details when it is initially undefined', () => {
        const { transformedActionDetails, references } = extractConnectorId({
          action: 'a',
          actionFields: ['a'],
          actionDetails: undefined,
          fieldType: UserActionFieldType.New,
        });

        expect(transformedActionDetails).toBeUndefined();
        expect(references).toEqual([]);
      });

      it('returns a json encoded string and empty references when the action is not a valid connector', () => {
        const { transformedActionDetails, references } = extractConnectorId({
          action: 'a',
          actionFields: ['a'],
          actionDetails: { a: 'hello' },
          fieldType: UserActionFieldType.New,
        });

        expect(JSON.parse(transformedActionDetails!)).toEqual({ a: 'hello' });
        expect(references).toEqual([]);
      });

      it('returns a json encoded string and empty references when the action details is an invalid object', () => {
        const { transformedActionDetails, references } = extractConnectorId({
          action: 'a',
          actionFields: ['a'],
          actionDetails: 5 as unknown as Record<string, unknown>,
          fieldType: UserActionFieldType.New,
        });

        expect(transformedActionDetails!).toEqual('5');
        expect(references).toEqual([]);
      });
    });

    describe('create', () => {
      it('extracts the connector.id from a new create jira connector to the references', () => {
        const { transformedActionDetails, references } = extractConnectorId({
          action: 'create',
          actionFields: ['connector'],
          actionDetails: createConnectorObject(),
          fieldType: UserActionFieldType.New,
        });

        const parsedJson = JSON.parse(transformedActionDetails!);

        expect(parsedJson).not.toHaveProperty('id');
        expect(parsedJson).toMatchInlineSnapshot(`
          Object {
            "connector": Object {
              "fields": Object {
                "issueType": "bug",
                "parent": "2",
                "priority": "high",
              },
              "name": ".jira",
              "type": ".jira",
            },
          }
        `);
        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "1",
              "name": "connectorId",
              "type": "action",
            },
          ]
        `);
      });

      it('extracts the connector.id from an old create jira connector to the references', () => {
        const { transformedActionDetails, references } = extractConnectorId({
          action: 'create',
          actionFields: ['connector'],
          actionDetails: createConnectorObject(),
          fieldType: UserActionFieldType.Old,
        });

        const parsedJson = JSON.parse(transformedActionDetails!);

        expect(parsedJson).not.toHaveProperty('id');
        expect(parsedJson).toMatchInlineSnapshot(`
          Object {
            "connector": Object {
              "fields": Object {
                "issueType": "bug",
                "parent": "2",
                "priority": "high",
              },
              "name": ".jira",
              "type": ".jira",
            },
          }
        `);
        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "1",
              "name": "oldConnectorId",
              "type": "action",
            },
          ]
        `);
      });
    });

    describe('update', () => {
      it('extracts the connector.id from a new create jira connector to the references', () => {
        const { transformedActionDetails, references } = extractConnectorId({
          action: 'update',
          actionFields: ['connector'],
          actionDetails: createJiraConnector(),
          fieldType: UserActionFieldType.New,
        });

        const parsedJson = JSON.parse(transformedActionDetails!);

        expect(parsedJson).not.toHaveProperty('id');
        expect(parsedJson).toMatchInlineSnapshot(`
          Object {
            "fields": Object {
              "issueType": "bug",
              "parent": "2",
              "priority": "high",
            },
            "name": ".jira",
            "type": ".jira",
          }
        `);
        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "1",
              "name": "connectorId",
              "type": "action",
            },
          ]
        `);
      });

      it('extracts the connector.id from an old create jira connector to the references', () => {
        const { transformedActionDetails, references } = extractConnectorId({
          action: 'update',
          actionFields: ['connector'],
          actionDetails: createJiraConnector(),
          fieldType: UserActionFieldType.Old,
        });

        const parsedJson = JSON.parse(transformedActionDetails!);

        expect(parsedJson).not.toHaveProperty('id');
        expect(parsedJson).toMatchInlineSnapshot(`
          Object {
            "fields": Object {
              "issueType": "bug",
              "parent": "2",
              "priority": "high",
            },
            "name": ".jira",
            "type": ".jira",
          }
        `);
        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "1",
              "name": "oldConnectorId",
              "type": "action",
            },
          ]
        `);
      });
    });

    describe('push action', () => {
      it('returns the stringified json without the connector_id', () => {
        const externalService = createExternalService();

        const { transformedActionDetails } = extractConnectorId({
          action: 'push-to-service',
          actionFields: ['pushed'],
          actionDetails: externalService,
          fieldType: UserActionFieldType.New,
        });

        const transformedExternalService = JSON.parse(transformedActionDetails!);
        expect(transformedExternalService).not.toHaveProperty('connector_id');
        expect(transformedExternalService).toMatchInlineSnapshot(`
          Object {
            "connector_name": ".jira",
            "external_id": "100",
            "external_title": "awesome",
            "external_url": "http://www.google.com",
            "pushed_at": "2019-11-25T21:54:48.952Z",
            "pushed_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
          }
        `);
      });

      it('returns a reference to the connector_id', () => {
        const externalService = createExternalService();

        const { references } = extractConnectorId({
          action: 'push-to-service',
          actionFields: ['pushed'],
          actionDetails: externalService,
          fieldType: UserActionFieldType.New,
        })!;

        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "100",
              "name": "pushConnectorId",
              "type": "action",
            },
          ]
        `);
      });

      it('returns a reference to the old action details connector_id', () => {
        const externalService = createExternalService();

        const { references } = extractConnectorId({
          action: 'push-to-service',
          actionFields: ['pushed'],
          actionDetails: externalService,
          fieldType: UserActionFieldType.Old,
        })!;

        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "100",
              "name": "oldPushConnectorId",
              "type": "action",
            },
          ]
        `);
      });
    });
  });

  describe('extractConnectorIdFromJson', () => {
    describe('fails to extract the id', () => {
      it('returns no references and null transformed json when action is undefined', () => {
        expect(
          extractConnectorIdFromJson({
            actionFields: [],
            actionDetails: undefined,
            fieldType: UserActionFieldType.New,
          })
        ).toEqual({
          transformedActionDetails: undefined,
          references: [],
        });
      });

      it('returns no references and undefined transformed json when actionFields is undefined', () => {
        expect(
          extractConnectorIdFromJson({ action: 'a', fieldType: UserActionFieldType.New })
        ).toEqual({
          transformedActionDetails: undefined,
          references: [],
        });
      });

      it('returns no references and undefined transformed json when actionDetails is undefined', () => {
        expect(
          extractConnectorIdFromJson({
            action: 'a',
            actionFields: [],
            fieldType: UserActionFieldType.New,
          })
        ).toEqual({
          transformedActionDetails: undefined,
          references: [],
        });
      });

      it('returns no references and undefined transformed json when actionDetails is null', () => {
        expect(
          extractConnectorIdFromJson({
            action: 'a',
            actionFields: [],
            actionDetails: null,
            fieldType: UserActionFieldType.New,
          })
        ).toEqual({
          transformedActionDetails: null,
          references: [],
        });
      });

      it('throws an error when actionDetails is invalid json', () => {
        expect(() =>
          extractConnectorIdFromJson({
            action: 'a',
            actionFields: [],
            actionDetails: '{a',
            fieldType: UserActionFieldType.New,
          })
        ).toThrow();
      });
    });

    describe('create action', () => {
      it('returns the stringified json without the id', () => {
        const jiraConnector = createConnectorObject();

        const { transformedActionDetails } = extractConnectorIdFromJson({
          action: 'create',
          actionFields: ['connector'],
          actionDetails: JSON.stringify(jiraConnector),
          fieldType: UserActionFieldType.New,
        });

        expect(JSON.parse(transformedActionDetails!)).toMatchInlineSnapshot(`
          Object {
            "connector": Object {
              "fields": Object {
                "issueType": "bug",
                "parent": "2",
                "priority": "high",
              },
              "name": ".jira",
              "type": ".jira",
            },
          }
        `);
      });

      it('returns a reference to the connector.id', () => {
        const jiraConnector = createConnectorObject();

        const { references } = extractConnectorIdFromJson({
          action: 'create',
          actionFields: ['connector'],
          actionDetails: JSON.stringify(jiraConnector),
          fieldType: UserActionFieldType.New,
        })!;

        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "1",
              "name": "connectorId",
              "type": "action",
            },
          ]
        `);
      });
    });

    describe('update action', () => {
      it('returns the stringified json without the id', () => {
        const jiraConnector = createJiraConnector();

        const { transformedActionDetails } = extractConnectorIdFromJson({
          action: 'update',
          actionFields: ['connector'],
          actionDetails: JSON.stringify(jiraConnector),
          fieldType: UserActionFieldType.New,
        });

        const transformedConnetor = JSON.parse(transformedActionDetails!);
        expect(transformedConnetor).not.toHaveProperty('id');
        expect(transformedConnetor).toMatchInlineSnapshot(`
          Object {
            "fields": Object {
              "issueType": "bug",
              "parent": "2",
              "priority": "high",
            },
            "name": ".jira",
            "type": ".jira",
          }
        `);
      });

      it('returns a reference to the connector.id', () => {
        const jiraConnector = createJiraConnector();

        const { references } = extractConnectorIdFromJson({
          action: 'update',
          actionFields: ['connector'],
          actionDetails: JSON.stringify(jiraConnector),
          fieldType: UserActionFieldType.New,
        })!;

        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "1",
              "name": "connectorId",
              "type": "action",
            },
          ]
        `);
      });
    });

    describe('push action', () => {
      it('returns the stringified json without the connector_id', () => {
        const externalService = createExternalService();

        const { transformedActionDetails } = extractConnectorIdFromJson({
          action: 'push-to-service',
          actionFields: ['pushed'],
          actionDetails: JSON.stringify(externalService),
          fieldType: UserActionFieldType.New,
        });

        const transformedExternalService = JSON.parse(transformedActionDetails!);
        expect(transformedExternalService).not.toHaveProperty('connector_id');
        expect(transformedExternalService).toMatchInlineSnapshot(`
          Object {
            "connector_name": ".jira",
            "external_id": "100",
            "external_title": "awesome",
            "external_url": "http://www.google.com",
            "pushed_at": "2019-11-25T21:54:48.952Z",
            "pushed_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
          }
        `);
      });

      it('returns a reference to the connector_id', () => {
        const externalService = createExternalService();

        const { references } = extractConnectorIdFromJson({
          action: 'push-to-service',
          actionFields: ['pushed'],
          actionDetails: JSON.stringify(externalService),
          fieldType: UserActionFieldType.New,
        })!;

        expect(references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "100",
              "name": "pushConnectorId",
              "type": "action",
            },
          ]
        `);
      });
    });
  });
});
