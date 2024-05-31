/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { KibanaLogic } from '../../../../shared/kibana';

import { AddConnectorApiLogic } from '../../../api/connector/add_connector_api_logic';

import { AddConnectorLogic, AddConnectorValues } from './add_connector_logic';

jest.mock('../../../../shared/kibana', () => ({
  KibanaLogic: { values: { navigateToUrl: jest.fn() } },
}));

const DEFAULT_VALUES: AddConnectorValues = {
  isModalVisible: false,
};

describe('AddConnectorLogic', () => {
  const { mount } = new LogicMounter(AddConnectorLogic);
  const { flashAPIErrors } = mockFlashMessageHelpers;

  it('has expected default values', () => {
    mount();
    expect(AddConnectorLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setIsModalVisible', () => {
      it('sets modal to visible', () => {
        AddConnectorLogic.actions.setIsModalVisible(true);
        expect(AddConnectorLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isModalVisible: true,
        });
      });
    });

    describe('apiError', () => {
      it('flashes error', async () => {
        AddConnectorApiLogic.actions.apiError('error' as any);
        await nextTick();
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });

    describe('apiSuccess', () => {
      it('navigates to correct spot and flashes success toast', async () => {
        jest.useFakeTimers({ legacyFakeTimers: true });
        AddConnectorApiLogic.actions.apiSuccess({ id: 'success123' } as any);
        await nextTick();
        jest.advanceTimersByTime(1001);
        await nextTick();
        expect(KibanaLogic.values.navigateToUrl).toHaveBeenCalledWith(
          '/connectors/success123/configuration'
        );
      });
    });
  });
});
