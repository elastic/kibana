/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectSanitizedDoc, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import type { CaseAttributes, CaseFullExternalService } from '../../../common/api';
import { CaseSeverity, CaseStatuses, ConnectorTypes, NONE_CONNECTOR_ID } from '../../../common/api';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { getNoneCaseConnector } from '../../common/utils';
import { ESCaseSeverity, ESCaseStatus } from '../../services/cases/types';
import type { ESCaseConnectorWithId } from '../../services/test_utils';
import { createExternalService } from '../../services/test_utils';
import {
  addAssignees,
  addDuration,
  addSeverity,
  addTotalAlerts,
  addTotalComments,
  caseConnectorIdMigration,
  convertSeverity,
  convertStatus,
  removeCaseType,
} from './cases';

// eslint-disable-next-line @typescript-eslint/naming-convention
const create_7_14_0_case = ({
  connector,
  externalService,
}: { connector?: ESCaseConnectorWithId; externalService?: CaseFullExternalService } = {}) => ({
  type: CASE_SAVED_OBJECT,
  id: '1',
  attributes: {
    connector,
    external_service: externalService,
  },
});

describe('case migrations', () => {
  describe('7.15.0 connector ID migration', () => {
    it('does not create a reference when the connector.id is none', () => {
      const caseSavedObject = create_7_14_0_case({ connector: getNoneCaseConnector() });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
      expect(migratedConnector.attributes.connector).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "name": "none",
          "type": ".none",
        }
      `);
    });

    it('does not create a reference when the connector is undefined', () => {
      const caseSavedObject = create_7_14_0_case();

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
      expect(migratedConnector.attributes.connector).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "name": "none",
          "type": ".none",
        }
      `);
    });

    it('sets the connector to the default none connector if the connector.id is undefined', () => {
      const caseSavedObject = create_7_14_0_case({
        connector: {
          fields: null,
          name: ConnectorTypes.jira,
          type: ConnectorTypes.jira,
        } as ESCaseConnectorWithId,
      });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
      expect(migratedConnector.attributes.connector).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "name": "none",
          "type": ".none",
        }
      `);
    });

    it('does not create a reference when the external_service is null', () => {
      const caseSavedObject = create_7_14_0_case({ externalService: null });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.external_service).toBeNull();
    });

    it('does not create a reference when the external_service is undefined and sets external_service to null', () => {
      const caseSavedObject = create_7_14_0_case();

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.external_service).toBeNull();
    });

    it('does not create a reference when the external_service.connector_id is none', () => {
      const caseSavedObject = create_7_14_0_case({
        externalService: createExternalService({ connector_id: NONE_CONNECTOR_ID }),
      });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.external_service).toMatchInlineSnapshot(`
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

    it('preserves the existing references when migrating', () => {
      const caseSavedObject = {
        ...create_7_14_0_case(),
        references: [{ id: '1', name: 'awesome', type: 'hello' }],
      };

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(1);
      expect(migratedConnector.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "1",
            "name": "awesome",
            "type": "hello",
          },
        ]
      `);
    });

    it('creates a connector reference and removes the connector.id field', () => {
      const caseSavedObject = create_7_14_0_case({
        connector: {
          id: '123',
          fields: null,
          name: 'connector',
          type: ConnectorTypes.jira,
        },
      });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(1);
      expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
      expect(migratedConnector.attributes.connector).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "name": "connector",
          "type": ".jira",
        }
      `);
      expect(migratedConnector.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "123",
            "name": "connectorId",
            "type": "action",
          },
        ]
      `);
    });

    it('creates a push connector reference and removes the connector_id field', () => {
      const caseSavedObject = create_7_14_0_case({
        externalService: {
          connector_id: '100',
          connector_name: '.jira',
          external_id: '100',
          external_title: 'awesome',
          external_url: 'http://www.google.com',
          pushed_at: '2019-11-25T21:54:48.952Z',
          pushed_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
        },
      });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(1);
      expect(migratedConnector.attributes.external_service).not.toHaveProperty('connector_id');
      expect(migratedConnector.attributes.external_service).toMatchInlineSnapshot(`
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
      expect(migratedConnector.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "100",
            "name": "pushConnectorId",
            "type": "action",
          },
        ]
      `);
    });

    it('does not create a reference and preserves the existing external_service fields when connector_id is null', () => {
      const caseSavedObject = create_7_14_0_case({
        externalService: {
          connector_id: 'none',
          connector_name: '.jira',
          external_id: '100',
          external_title: 'awesome',
          external_url: 'http://www.google.com',
          pushed_at: '2019-11-25T21:54:48.952Z',
          pushed_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
        },
      });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.external_service).not.toHaveProperty('connector_id');
      expect(migratedConnector.attributes.external_service).toMatchInlineSnapshot(`
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

    it('migrates both connector and external_service when provided', () => {
      const caseSavedObject = create_7_14_0_case({
        externalService: {
          connector_id: '100',
          connector_name: '.jira',
          external_id: '100',
          external_title: 'awesome',
          external_url: 'http://www.google.com',
          pushed_at: '2019-11-25T21:54:48.952Z',
          pushed_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
        },
        connector: {
          id: '123',
          fields: null,
          name: 'connector',
          type: ConnectorTypes.jira,
        },
      });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(2);
      expect(migratedConnector.attributes.external_service).not.toHaveProperty('connector_id');
      expect(migratedConnector.attributes.external_service).toMatchInlineSnapshot(`
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
      expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
      expect(migratedConnector.attributes.connector).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "name": "connector",
          "type": ".jira",
        }
      `);
      expect(migratedConnector.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "123",
            "name": "connectorId",
            "type": "action",
          },
          Object {
            "id": "100",
            "name": "pushConnectorId",
            "type": "action",
          },
        ]
      `);
    });
  });

  describe('removeCaseType', () => {
    it('removes the type field from the document', () => {
      const doc = {
        id: '123',
        attributes: {
          type: 'individual',
          title: 'case',
        },
        type: 'abc',
        references: [],
      };

      expect(removeCaseType(doc)).toEqual({
        ...doc,
        attributes: {
          title: doc.attributes.title,
        },
      });
    });
  });

  describe('addDuration', () => {
    it('adds the duration correctly', () => {
      const doc = {
        id: '123',
        attributes: {
          created_at: '2021-11-23T19:00:00Z',
          closed_at: '2021-11-23T19:02:00Z',
        },
        type: 'abc',
        references: [],
      } as unknown as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(addDuration(doc)).toEqual({
        ...doc,
        attributes: {
          ...doc.attributes,
          duration: 120,
        },
      });
    });

    it.each([['invalid'], [null]])(
      'returns null if the createdAt date is %s',
      (createdAtInvalid) => {
        const doc = {
          id: '123',
          attributes: {
            created_at: createdAtInvalid,
            closed_at: '2021-11-23T19:02:00Z',
          },
          type: 'abc',
          references: [],
        } as unknown as SavedObjectSanitizedDoc<CaseAttributes>;

        expect(addDuration(doc)).toEqual({
          ...doc,
          attributes: {
            ...doc.attributes,
            duration: null,
          },
        });
      }
    );

    it.each([['invalid'], [null]])('returns null if the closedAt date is %s', (closedAtInvalid) => {
      const doc = {
        id: '123',
        attributes: {
          created_at: '2021-11-23T19:02:00Z',
          closed_at: closedAtInvalid,
        },
        type: 'abc',
        references: [],
      } as unknown as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(addDuration(doc)).toEqual({
        ...doc,
        attributes: {
          ...doc.attributes,
          duration: null,
        },
      });
    });

    it('returns null if created_at > closed_at', () => {
      const doc = {
        id: '123',
        attributes: {
          created_at: '2021-11-23T19:05:00Z',
          closed_at: '2021-11-23T19:00:00Z',
        },
        type: 'abc',
        references: [],
      } as unknown as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(addDuration(doc)).toEqual({
        ...doc,
        attributes: {
          ...doc.attributes,
          duration: null,
        },
      });
    });

    it('rounds the seconds correctly', () => {
      const doc = {
        id: '123',
        attributes: {
          created_at: '2022-04-11T15:56:00.087Z',
          closed_at: '2022-04-11T15:58:56.187Z',
        },
        type: 'abc',
        references: [],
      } as unknown as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(addDuration(doc)).toEqual({
        ...doc,
        attributes: {
          ...doc.attributes,
          duration: 176,
        },
      });
    });

    it('rounds to zero correctly', () => {
      const doc = {
        id: '123',
        attributes: {
          created_at: '2022-04-11T15:56:00.087Z',
          closed_at: '2022-04-11T15:56:00.187Z',
        },
        type: 'abc',
        references: [],
      } as unknown as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(addDuration(doc)).toEqual({
        ...doc,
        attributes: {
          ...doc.attributes,
          duration: 0,
        },
      });
    });
  });

  describe('add severity', () => {
    it('adds the severity correctly when none is present', () => {
      const doc = {
        id: '123',
        attributes: {
          created_at: '2021-11-23T19:00:00Z',
          closed_at: '2021-11-23T19:02:00Z',
        },
        type: 'abc',
        references: [],
      } as unknown as SavedObjectSanitizedDoc<CaseAttributes>;
      expect(addSeverity(doc)).toEqual({
        ...doc,
        attributes: {
          ...doc.attributes,
          severity: CaseSeverity.LOW,
        },
      });
    });

    it('keeps the existing value if the field already exists', () => {
      const doc = {
        id: '123',
        attributes: {
          severity: CaseSeverity.CRITICAL,
          created_at: '2021-11-23T19:00:00Z',
          closed_at: '2021-11-23T19:02:00Z',
        },
        type: 'abc',
        references: [],
      } as unknown as SavedObjectSanitizedDoc<CaseAttributes>;
      expect(addSeverity(doc)).toEqual({
        ...doc,
        attributes: {
          ...doc.attributes,
          severity: CaseSeverity.CRITICAL,
        },
      });
    });
  });

  describe('addAssignees', () => {
    it('adds the assignees field correctly when none is present', () => {
      const doc = {
        id: '123',
        attributes: {},
        type: 'abc',
        references: [],
      } as unknown as SavedObjectSanitizedDoc<CaseAttributes>;
      expect(addAssignees(doc)).toEqual({
        ...doc,
        attributes: {
          ...doc.attributes,
          assignees: [],
        },
      });
    });

    it('keeps the existing assignees value if the field already exists', () => {
      const assignees = [{ uid: '1' }];
      const doc = {
        id: '123',
        attributes: {
          assignees,
        },
        type: 'abc',
        references: [],
      } as unknown as SavedObjectSanitizedDoc<CaseAttributes>;
      expect(addAssignees(doc)).toEqual({
        ...doc,
        attributes: {
          ...doc.attributes,
          assignees,
        },
      });
    });
  });

  describe('update severity', () => {
    it.each([
      [CaseSeverity.LOW, ESCaseSeverity.LOW],
      [CaseSeverity.MEDIUM, ESCaseSeverity.MEDIUM],
      [CaseSeverity.HIGH, ESCaseSeverity.HIGH],
      [CaseSeverity.CRITICAL, ESCaseSeverity.CRITICAL],
    ])(
      'migrates "%s" severity keyword value to matching short',
      (oldSeverityValue, expectedSeverityValue) => {
        const doc = {
          id: '123',
          type: 'abc',
          attributes: {
            severity: oldSeverityValue,
          },
          references: [],
        } as unknown as SavedObjectUnsanitizedDoc<CaseAttributes>;

        expect(convertSeverity(doc)).toEqual({
          ...doc,
          attributes: {
            ...doc.attributes,
            severity: expectedSeverityValue,
          },
          references: [],
        });
      }
    );

    it('default value for severity is 0(LOW) if it does not exist', () => {
      const doc = {
        id: '123',
        type: 'abc',
        attributes: {},
        references: [],
      } as unknown as SavedObjectUnsanitizedDoc<CaseAttributes>;

      expect(convertSeverity(doc)).toEqual({
        ...doc,
        attributes: {
          ...doc.attributes,
          severity: ESCaseSeverity.LOW,
        },
        references: [],
      });
    });
  });

  describe('update status', () => {
    it.each([
      [CaseStatuses.open, ESCaseStatus.OPEN],
      [CaseStatuses['in-progress'], ESCaseStatus.IN_PROGRESS],
      [CaseStatuses.closed, ESCaseStatus.CLOSED],
    ])(
      'migrates "%s" status keyword value to matching short',
      (oldStatusValue, expectedStatusValue) => {
        const doc = {
          id: '123',
          type: 'abc',
          attributes: {
            status: oldStatusValue,
          },
          references: [],
        } as unknown as SavedObjectUnsanitizedDoc<CaseAttributes>;

        expect(convertStatus(doc)).toEqual({
          ...doc,
          attributes: {
            ...doc.attributes,
            status: expectedStatusValue,
          },
          references: [],
        });
      }
    );

    it('default value for status is 0(OPEN) if it does not exist', () => {
      const doc = {
        id: '123',
        type: 'abc',
        attributes: {},
        references: [],
      } as unknown as SavedObjectUnsanitizedDoc<CaseAttributes>;

      expect(convertStatus(doc)).toEqual({
        ...doc,
        attributes: {
          ...doc.attributes,
          status: ESCaseStatus.OPEN,
        },
        references: [],
      });
    });

    it('default value for total_alerts is -1', () => {
      const doc = {
        id: '123',
        type: 'abc',
        attributes: {
          title: 'foobar',
        },
        references: [],
      } as unknown as SavedObjectUnsanitizedDoc<CaseAttributes>;

      expect(addTotalAlerts(doc)).toEqual({
        ...doc,
        attributes: {
          ...doc.attributes,
          total_alerts: -1,
        },
        references: [],
      });
    });

    it('default value for total_comments is -1', () => {
      const doc = {
        id: '123',
        type: 'abc',
        attributes: {
          title: 'foobar',
        },
        references: [],
      } as unknown as SavedObjectUnsanitizedDoc<CaseAttributes>;

      expect(addTotalComments(doc)).toEqual({
        ...doc,
        attributes: {
          ...doc.attributes,
          total_comments: -1,
        },
        references: [],
      });
    });
  });
});
