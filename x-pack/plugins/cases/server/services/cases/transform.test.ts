/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorIdReferenceName, pushConnectorIdReferenceName } from '..';
import { createExternalService } from '../test_utils';
import { transformUpdateResponseToExternalModel } from './transform';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import { ConnectorTypes } from '../../../common';

describe('transformUpdateResponseToExternalModel', () => {
  it('does not return the connector field if it is undefined', () => {
    expect(
      transformUpdateResponseToExternalModel({
        type: 'a',
        id: '1',
        attributes: {},
        references: undefined,
      }).attributes
    ).not.toHaveProperty('connector');
  });

  it('does not return the external_service field if it is undefined', () => {
    expect(
      transformUpdateResponseToExternalModel({
        type: 'a',
        id: '1',
        attributes: {},
        references: undefined,
      }).attributes
    ).not.toHaveProperty('external_service');
  });

  it('return a null external_service field if it is null', () => {
    expect(
      transformUpdateResponseToExternalModel({
        type: 'a',
        id: '1',
        attributes: {
          external_service: null,
        },
        references: undefined,
      }).attributes.external_service
    ).toBeNull();
  });

  it('return a null external_service.connector_id field if it is none', () => {
    expect(
      transformUpdateResponseToExternalModel({
        type: 'a',
        id: '1',
        attributes: {
          external_service: createExternalService({ connector_id: 'none' }),
        },
        references: undefined,
      }).attributes.external_service?.connector_id
    ).toBeNull();
  });

  it('return the external_service fields if it is populated', () => {
    const { connector_id: ignore, ...restExternalService } = createExternalService()!;
    expect(
      transformUpdateResponseToExternalModel({
        type: 'a',
        id: '1',
        attributes: {
          external_service: restExternalService,
        },
        references: undefined,
      }).attributes.external_service
    ).toMatchInlineSnapshot(`
      Object {
        "connector_id": null,
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

  it('populates the connector_id field when it finds a reference', () => {
    expect(
      transformUpdateResponseToExternalModel({
        type: 'a',
        id: '1',
        attributes: {
          external_service: createExternalService(),
        },
        references: [
          { id: '1', name: pushConnectorIdReferenceName, type: ACTION_SAVED_OBJECT_TYPE },
        ],
      }).attributes.external_service?.connector_id
    ).toMatchInlineSnapshot(`"1"`);
  });

  it('populates the external_service fields when it finds a reference', () => {
    expect(
      transformUpdateResponseToExternalModel({
        type: 'a',
        id: '1',
        attributes: {
          external_service: createExternalService(),
        },
        references: [
          { id: '1', name: pushConnectorIdReferenceName, type: ACTION_SAVED_OBJECT_TYPE },
        ],
      }).attributes.external_service
    ).toMatchInlineSnapshot(`
      Object {
        "connector_id": "1",
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

  it('populates the connector fields when it finds a reference', () => {
    expect(
      transformUpdateResponseToExternalModel({
        type: 'a',
        id: '1',
        attributes: {
          connector: {
            name: ConnectorTypes.jira,
            type: ConnectorTypes.jira,
            fields: [{ key: 'issueType', value: 'bug' }],
          },
        },
        references: [{ id: '1', name: connectorIdReferenceName, type: ACTION_SAVED_OBJECT_TYPE }],
      }).attributes.connector
    ).toMatchInlineSnapshot(`
      Object {
        "fields": Object {
          "issueType": "bug",
        },
        "id": "1",
        "name": ".jira",
        "type": ".jira",
      }
    `);
  });
});
