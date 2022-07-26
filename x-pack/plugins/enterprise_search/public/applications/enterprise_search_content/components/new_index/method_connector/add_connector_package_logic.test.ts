/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { KibanaLogic } from '../../../../shared/kibana';

import { AddConnectorPackageApiLogic } from '../../../api/connector_package/add_connector_package_api_logic';

import { AddConnectorPackageLogic, AddConnectorValues } from './add_connector_package_logic';

jest.mock('../../../../shared/kibana', () => ({
  KibanaLogic: { values: { navigateToUrl: jest.fn() } },
}));

const DEFAULT_VALUES: AddConnectorValues = {
  isModalVisible: false,
};

describe('AddConnectorPackageLogic', () => {
  const { mount } = new LogicMounter(AddConnectorPackageLogic);
  const { flashAPIErrors, flashSuccessToast } = mockFlashMessageHelpers;

  it('has expected default values', () => {
    mount();
    expect(AddConnectorPackageLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setIsModalVisible', () => {
      it('sets modal to visible', () => {
        AddConnectorPackageLogic.actions.setIsModalVisible(true);
        expect(AddConnectorPackageLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isModalVisible: true,
        });
      });
    });

    describe('apiError', () => {
      it('flashes error', async () => {
        AddConnectorPackageApiLogic.actions.apiError('error' as any);
        await nextTick();
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });

    describe('apiSuccess', () => {
      it('navigates to correct spot and flashes success toast', async () => {
        jest.useFakeTimers();
        AddConnectorPackageApiLogic.actions.apiSuccess({ indexName: 'success' } as any);
        await nextTick();
        expect(flashSuccessToast).toHaveBeenCalled();
        jest.advanceTimersByTime(1001);
        await nextTick();
        expect(KibanaLogic.values.navigateToUrl).toHaveBeenCalledWith(
          '/search_indices/success/configuration'
        );
      });
    });
  });
});
