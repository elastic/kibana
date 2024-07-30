/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '..';
import { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { experimentalFeaturesMock, registrationServicesMock } from '../../mocks';
import { SUB_ACTION } from '../../../common/thehive/constants';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';

const CONNECTOR_TYPE_ID = '.thehive';
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

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_TYPE_ID);
  });
});

describe('thehive pushToService action params validation', () => {
  test('pushToService action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      subAction: SUB_ACTION.PUSH_TO_SERVICE,
      subActionParams: {
        incident: {
          title: 'title {test}',
          description: 'test description',
        },
      },
      comments: [],
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'pushToServiceParam.incident.title': [],
        'pushToServiceParam.incident.description': [],
        'createAlertParam.title': [],
        'createAlertParam.description': [],
        'createAlertParam.type': [],
        'createAlertParam.source': [],
        'createAlertParam.sourceRef': [],
      },
    });
  });

  test('pushToService action params validation fails when Required fields is not valid', async () => {
    const actionParams = {
      subAction: SUB_ACTION.PUSH_TO_SERVICE,
      subActionParams: {
        incident: {
          title: '',
          description: '',
        },
      },
      comments: [],
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'pushToServiceParam.incident.title': ['Title is required.'],
        'pushToServiceParam.incident.description': ['Description is required.'],
        'createAlertParam.title': [],
        'createAlertParam.description': [],
        'createAlertParam.type': [],
        'createAlertParam.source': [],
        'createAlertParam.sourceRef': [],
      },
    });
  });
});

describe('thehive createAlert action params validation', () => {
  test('createAlert action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      subAction: SUB_ACTION.CREATE_ALERT,
      subActionParams: {
        title: 'some title {test}',
        description: 'some description {test}',
        type: 'type test',
        source: 'source test',
        sourceRef: 'source reference test',
      },
      comments: [],
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'pushToServiceParam.incident.title': [],
        'pushToServiceParam.incident.description': [],
        'createAlertParam.title': [],
        'createAlertParam.description': [],
        'createAlertParam.type': [],
        'createAlertParam.source': [],
        'createAlertParam.sourceRef': [],
      },
    });
  });

  test('params validation fails when Required fields is not valid', async () => {
    const actionParams = {
      subAction: SUB_ACTION.CREATE_ALERT,
      subActionParams: {
        title: '',
        description: '',
        type: '',
        source: '',
        sourceRef: '',
      },
      comments: [],
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'pushToServiceParam.incident.title': [],
        'pushToServiceParam.incident.description': [],
        'createAlertParam.title': ['Title is required.'],
        'createAlertParam.description': ['Description is required.'],
        'createAlertParam.type': ['Type is required.'],
        'createAlertParam.source': ['Source is required.'],
        'createAlertParam.sourceRef': ['Source Reference is required.'],
      },
    });
  });
});
