/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../../__mocks__/kea_logic';

import { mockFlashMessageHelpers } from '../../../../../../__mocks__/kea_logic';

import { Status } from '../../../../../../../../common/types/api';

jest.mock('../../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));

import { CustomSource } from '../../../../../types';

import { AddCustomSourceApiLogic } from './add_custom_source_api_logic';
import { AddCustomSourceLogic, AddCustomSourceSteps } from './add_custom_source_logic';

const DEFAULT_VALUES = {
  currentStep: AddCustomSourceSteps.ConfigureCustomStep,
  buttonLoading: false,
  customSourceNameValue: '',
  newCustomSource: {} as CustomSource,
  status: Status.IDLE,
};

const MOCK_NAME = 'name';

describe('AddCustomSourceLogic', () => {
  const { mount } = new LogicMounter(AddCustomSourceLogic);
  const { clearFlashMessages, flashAPIErrors } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    mount({});
  });

  it('has expected default values', () => {
    expect(AddCustomSourceLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('apiSuccess', () => {
      it('sets a new source', () => {
        AddCustomSourceLogic.actions.makeRequest({ name: 'name' });
        const source: CustomSource = {
          accessToken: 'a',
          name: 'b',
          id: '1',
        };
        AddCustomSourceLogic.actions.apiSuccess({ source });

        expect(AddCustomSourceLogic.values).toEqual({
          ...DEFAULT_VALUES,
          customSourceNameValue: '',
          newCustomSource: source,
          status: Status.SUCCESS,
          currentStep: AddCustomSourceSteps.SaveCustomStep,
        });
      });
    });
    describe('makeRequest', () => {
      it('sets button to loading', () => {
        AddCustomSourceLogic.actions.makeRequest({ name: 'name' });

        expect(AddCustomSourceLogic.values).toEqual({
          ...DEFAULT_VALUES,
          buttonLoading: true,
          status: Status.LOADING,
        });
      });
    });
    describe('apiError', () => {
      it('sets button to not loading', () => {
        AddCustomSourceLogic.actions.makeRequest({ name: 'name' });
        AddCustomSourceLogic.actions.apiError('error' as any);

        expect(AddCustomSourceLogic.values).toEqual({
          ...DEFAULT_VALUES,
          buttonLoading: false,
          status: Status.ERROR,
        });
      });
    });
    describe('setCustomSourceNameValue', () => {
      it('saves the name', () => {
        AddCustomSourceLogic.actions.setCustomSourceNameValue('name');

        expect(AddCustomSourceLogic.values).toEqual({
          ...DEFAULT_VALUES,
          customSourceNameValue: 'name',
        });
      });
    });

    describe('setNewCustomSource', () => {
      it('saves the custom source', () => {
        const newCustomSource = {
          accessToken: 'foo',
          key: 'bar',
          name: 'source',
          id: '123key',
        };

        AddCustomSourceLogic.actions.setNewCustomSource(newCustomSource);

        expect(AddCustomSourceLogic.values).toEqual({
          ...DEFAULT_VALUES,
          newCustomSource,
          currentStep: AddCustomSourceSteps.SaveCustomStep,
        });
      });
    });
  });

  describe('listeners', () => {
    beforeEach(() => {
      mount({
        customSourceNameValue: MOCK_NAME,
      });
    });
    describe('createContentSource', () => {
      it('calls addSource on AddCustomSourceApi logic', async () => {
        const addSourceSpy = jest.spyOn(AddCustomSourceLogic.actions, 'makeRequest');

        AddCustomSourceLogic.actions.createContentSource();
        expect(addSourceSpy).toHaveBeenCalledWith({
          name: MOCK_NAME,
          baseServiceType: undefined,
        });
      });

      it('submits a base service type for pre-configured sources', () => {
        mount(
          {
            customSourceNameValue: MOCK_NAME,
          },
          {
            baseServiceType: 'share_point_server',
          }
        );

        const addSourceSpy = jest.spyOn(AddCustomSourceLogic.actions, 'makeRequest');

        AddCustomSourceLogic.actions.createContentSource();

        expect(addSourceSpy).toHaveBeenCalledWith({
          name: MOCK_NAME,
          baseServiceType: 'share_point_server',
        });
      });
    });
    describe('makeRequest', () => {
      it('should call clearFlashMessages', () => {
        AddCustomSourceApiLogic.actions.makeRequest({ name: 'name' });
        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });
    describe('apiError', () => {
      it('should call flashAPIError', () => {
        AddCustomSourceApiLogic.actions.apiError('error' as any);
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});
