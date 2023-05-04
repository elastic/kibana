/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../__mocks__/kea_logic';

import { UpdateConnectorSchedulingApiLogic } from '../../../api/connector/update_connector_scheduling_api_logic';

import { ConnectorSchedulingLogic } from './connector_scheduling_logic';

describe('ConnectorSchedulingLogic', () => {
  const { mount } = new LogicMounter(ConnectorSchedulingLogic);
  const DEFAULT_VALUES = {
    hasChanges: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount({});
  });
  it('has expected default values', () => {
    expect(ConnectorSchedulingLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('reducers', () => {
    describe('hasChanges', () => {
      it('should set false on apiSuccess', () => {
        ConnectorSchedulingLogic.actions.setHasChanges(true);
        UpdateConnectorSchedulingApiLogic.actions.apiSuccess({
          enabled: false,
          interval: '',
        });
        expect(ConnectorSchedulingLogic.values).toEqual({
          ...DEFAULT_VALUES,
          hasChanges: false,
        });
      });
      it('should set hasChanges on setHasChanges', () => {
        ConnectorSchedulingLogic.actions.setHasChanges(true);
        expect(ConnectorSchedulingLogic.values).toEqual({
          ...DEFAULT_VALUES,
          hasChanges: true,
        });
      });
    });
  });
});
