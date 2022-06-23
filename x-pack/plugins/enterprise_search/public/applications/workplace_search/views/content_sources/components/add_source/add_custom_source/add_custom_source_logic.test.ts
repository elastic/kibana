/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../../__mocks__/kea_logic';

jest.mock('../../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));

import { CustomSource } from '../../../../../types';

import { AddCustomSourceLogic, AddCustomSourceSteps } from './add_custom_source_logic';

const DEFAULT_VALUES = {
  currentStep: AddCustomSourceSteps.ConfigureCustomStep,
  buttonLoading: false,
  customSourceNameValue: '',
  newCustomSource: {} as CustomSource,
  sourceApi: {
    status: 'IDLE',
  },
};

const MOCK_NAME = 'name';

describe('AddCustomSourceLogic', () => {
  const { mount } = new LogicMounter(AddCustomSourceLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    mount({});
  });

  it('has expected default values', () => {
    expect(AddCustomSourceLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('addSourceSuccess', () => {
      it('sets a new source', () => {
        const customSource: CustomSource = {
          accessToken: 'a',
          name: 'b',
          id: '1',
        };
        AddCustomSourceLogic.actions.addSourceSuccess(customSource);

        expect(AddCustomSourceLogic.values).toEqual({
          ...DEFAULT_VALUES,
          customSourceNameValue: '',
          newCustomSource: customSource,
          sourceApi: {
            status: 'SUCCESS',
            data: customSource,
          },
          currentStep: AddCustomSourceSteps.SaveCustomStep,
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

    describe('organization context', () => {
      describe('createContentSource', () => {
        it('calls addSource on AddCustomSourceApi logic', async () => {
          const addSourceSpy = jest.spyOn(AddCustomSourceLogic.actions, 'addSource');

          AddCustomSourceLogic.actions.createContentSource();
          expect(addSourceSpy).toHaveBeenCalledWith(MOCK_NAME, undefined);
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

          const addSourceSpy = jest.spyOn(AddCustomSourceLogic.actions, 'addSource');

          AddCustomSourceLogic.actions.createContentSource();

          expect(addSourceSpy).toHaveBeenCalledWith(MOCK_NAME, 'share_point_server');
        });
      });
    });
  });
});
