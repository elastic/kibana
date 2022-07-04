/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../../__mocks__/kea_logic';

import { ConnectorConfigurationApiLogic } from '../../../api/connector_package/update_connector_configuration_api_logic';

import { ConnectorConfigurationLogic } from './connector_configuration_logic';

// jest.mock('../../api', () => ({
//   AppLogic: { values: { isOrganization: true } },
// }));

const DEFAULT_VALUES = {
  configState: { foo: 'bar' },
  isEditing: false,
};

describe('ConnectorConfigurationLogic', () => {
  const { mount } = new LogicMounter(ConnectorConfigurationLogic);
  const { clearFlashMessages, flashAPIErrors } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    mount({}, { configuration: { foo: 'bar' } });
  });

  it('has expected default values', () => {
    expect(ConnectorConfigurationLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('reducers', () => {
    describe('apiSuccess', () => {
      it('should set config on apiSuccess', () => {
        ConnectorConfigurationApiLogic.actions.apiSuccess({
          configuration: { foo: { label: 'newBar', value: 'oldBar' } },
          indexName: 'indexName',
        });
        expect(ConnectorConfigurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          configState: { foo: { label: 'newBar', value: 'oldBar' } },
        });
      });
      it('should set config on setConfigState', () => {
        ConnectorConfigurationLogic.actions.setConfigState({
          foo: { label: 'thirdBar', value: 'fourthBar' },
        });
        expect(ConnectorConfigurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          configState: { foo: { label: 'thirdBar', value: 'fourthBar' } },
        });
      });
    });
    describe('isEditing', () => {
      it('should set isEditing to false on apiSuccess', () => {
        ConnectorConfigurationLogic.actions.setIsEditing(true);
        ConnectorConfigurationApiLogic.actions.apiSuccess({
          configuration: { foo: { label: 'newBar', value: 'oldBar' } },
          indexName: 'indexName',
        });
        expect(ConnectorConfigurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          configState: { foo: { label: 'newBar', value: 'oldBar' } },
        });
      });
      it('should set config on setConfigState', () => {
        ConnectorConfigurationLogic.actions.setIsEditing(true);
        expect(ConnectorConfigurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isEditing: true,
        });
      });
    });
  });

  describe('actions', () => {
    describe('makeRequest', () => {
      it('should call clearFlashMessages', () => {
        ConnectorConfigurationLogic.actions.makeRequest({
          configuration: {},
          indexId: 'id',
          indexName: 'name',
        });
        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });
    describe('apiError', () => {
      it('should call flashAPIError', () => {
        ConnectorConfigurationLogic.actions.apiError('error' as any);
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});
