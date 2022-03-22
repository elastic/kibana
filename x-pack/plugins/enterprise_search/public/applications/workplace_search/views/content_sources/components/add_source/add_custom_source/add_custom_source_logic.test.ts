/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
} from '../../../../../../__mocks__/kea_logic';
import { sourceConfigData } from '../../../../../__mocks__/content_sources.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { docLinks } from '../../../../../../shared/doc_links';
import { itShowsServerErrorAsFlashMessage } from '../../../../../../test_helpers';

jest.mock('../../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));
import { AppLogic } from '../../../../../app_logic';

import { SOURCE_NAMES } from '../../../../../constants';
import { CustomSource, SourceDataItem } from '../../../../../types';

import { AddCustomSourceLogic, AddCustomSourceSteps } from './add_custom_source_logic';

const CUSTOM_SOURCE_DATA_ITEM: SourceDataItem = {
  name: SOURCE_NAMES.CUSTOM,
  iconName: SOURCE_NAMES.CUSTOM,
  serviceType: 'custom',
  configuration: {
    isPublicKey: false,
    hasOauthRedirect: false,
    needsBaseUrl: false,
    documentationUrl: docLinks.workplaceSearchCustomSources,
    applicationPortalUrl: '',
  },
  accountContextOnly: false,
};

const DEFAULT_VALUES = {
  currentStep: AddCustomSourceSteps.ConfigureCustomStep,
  buttonLoading: false,
  customSourceNameValue: '',
  newCustomSource: {} as CustomSource,
  sourceData: CUSTOM_SOURCE_DATA_ITEM,
};

const MOCK_PROPS = { initialValue: '', sourceData: CUSTOM_SOURCE_DATA_ITEM };

const MOCK_NAME = 'name';

describe('AddCustomSourceLogic', () => {
  const { mount } = new LogicMounter(AddCustomSourceLogic);
  const { http } = mockHttpValues;
  const { clearFlashMessages } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    mount({}, MOCK_PROPS);
  });

  it('has expected default values', () => {
    expect(AddCustomSourceLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setButtonNotLoading', () => {
      it('turns off the button loading flag', () => {
        AddCustomSourceLogic.actions.setButtonNotLoading();

        expect(AddCustomSourceLogic.values).toEqual({
          ...DEFAULT_VALUES,
          buttonLoading: false,
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
      mount(
        {
          customSourceNameValue: MOCK_NAME,
        },
        MOCK_PROPS
      );
    });

    describe('organization context', () => {
      describe('createContentSource', () => {
        it('calls API and sets values', async () => {
          const setButtonNotLoadingSpy = jest.spyOn(
            AddCustomSourceLogic.actions,
            'setButtonNotLoading'
          );
          const setNewCustomSourceSpy = jest.spyOn(
            AddCustomSourceLogic.actions,
            'setNewCustomSource'
          );
          http.post.mockReturnValue(Promise.resolve({ sourceConfigData }));

          AddCustomSourceLogic.actions.createContentSource();

          expect(clearFlashMessages).toHaveBeenCalled();
          expect(AddCustomSourceLogic.values.buttonLoading).toEqual(true);
          expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/org/create_source', {
            body: JSON.stringify({ service_type: 'custom', name: MOCK_NAME }),
          });
          await nextTick();
          expect(setNewCustomSourceSpy).toHaveBeenCalledWith({ sourceConfigData });
          expect(setButtonNotLoadingSpy).toHaveBeenCalled();
        });

        itShowsServerErrorAsFlashMessage(http.post, () => {
          AddCustomSourceLogic.actions.createContentSource();
        });
      });
    });

    describe('account context routes', () => {
      beforeEach(() => {
        AppLogic.values.isOrganization = false;
      });

      describe('createContentSource', () => {
        it('sends relevant fields to the API', () => {
          AddCustomSourceLogic.actions.createContentSource();

          expect(http.post).toHaveBeenCalledWith(
            '/internal/workplace_search/account/create_source',
            {
              body: JSON.stringify({ service_type: 'custom', name: MOCK_NAME }),
            }
          );
        });

        itShowsServerErrorAsFlashMessage(http.post, () => {
          AddCustomSourceLogic.actions.createContentSource();
        });
      });
    });
  });
});
