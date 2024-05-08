/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '..';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { experimentalFeaturesMock, registrationServicesMock } from '../../mocks';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';
import { MAX_OTHER_FIELDS_LENGTH } from '../../../common/jira/constants';

const CONNECTOR_TYPE_ID = '.jira';
let connectorTypeModel: ConnectorTypeModel;

beforeAll(() => {
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  ExperimentalFeaturesService.init({ experimentalFeatures: experimentalFeaturesMock });
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(CONNECTOR_TYPE_ID);
  if (getResult !== null) {
    connectorTypeModel = getResult;
  }
});

describe('connectorTypeRegistry.get() works', () => {
  test('connector type static data is as expected', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_TYPE_ID);
  });
});

describe('jira action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      subActionParams: { incident: { summary: 'some title {{test}}' }, comments: [] },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.incident.summary': [],
        'subActionParams.incident.labels': [],
        'subActionParams.incident.otherFields': [],
      },
    });
  });

  test('params validation fails when body is not valid', async () => {
    const actionParams = {
      subActionParams: { incident: { summary: '' }, comments: [] },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.incident.summary': ['Summary is required.'],
        'subActionParams.incident.labels': [],
        'subActionParams.incident.otherFields': [],
      },
    });
  });

  test('params validation fails when labels contain spaces', async () => {
    const actionParams = {
      subActionParams: {
        incident: { summary: 'some title', labels: ['label with spaces'] },
        comments: [],
      },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.incident.summary': [],
        'subActionParams.incident.labels': ['Labels cannot contain spaces.'],
        'subActionParams.incident.otherFields': [],
      },
    });
  });

  test('params validation fails when otherFields is not valid JSON', async () => {
    const actionParams = {
      subActionParams: {
        incident: { summary: 'some title', otherFields: 'invalid json' },
        comments: [],
      },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.incident.summary': [],
        'subActionParams.incident.labels': [],
        'subActionParams.incident.otherFields': [
          'Additional fields field must be a valid JSON object.',
        ],
      },
    });
  });

  test(`params validation succeeds when its valid json and otherFields has ${MAX_OTHER_FIELDS_LENGTH} fields`, async () => {
    const longJSON: { [key in string]: string } = {};
    for (let i = 0; i < MAX_OTHER_FIELDS_LENGTH; i++) {
      longJSON[`key${i}`] = 'value';
    }
    const actionParams = {
      subActionParams: {
        incident: {
          summary: 'some title',
          otherFields: JSON.stringify(longJSON),
        },
        comments: [],
      },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.incident.summary': [],
        'subActionParams.incident.labels': [],
        'subActionParams.incident.otherFields': [],
      },
    });
  });

  test(`params validation fails when otherFields has ${
    MAX_OTHER_FIELDS_LENGTH + 1
  } fields`, async () => {
    const longJSON: { [key in string]: string } = {};
    for (let i = 0; i < MAX_OTHER_FIELDS_LENGTH + 1; i++) {
      longJSON[`key${i}`] = 'value';
    }
    const actionParams = {
      subActionParams: {
        incident: {
          summary: 'some title',
          otherFields: JSON.stringify(longJSON),
        },
        comments: [],
      },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.incident.summary': [],
        'subActionParams.incident.labels': [],
        'subActionParams.incident.otherFields': [
          `A maximum of ${MAX_OTHER_FIELDS_LENGTH} additional fields can be defined at a time.`,
        ],
      },
    });
  });
});
