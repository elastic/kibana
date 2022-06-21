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

import { itShowsServerErrorAsFlashMessage } from '../../../../../../test_helpers';

jest.mock('../../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));
import { AppLogic } from '../../../../../app_logic';

import { AddCustomSourceApiLogic } from './add_custom_source_api_logic';

const DEFAULT_VALUES = {
  sourceApi: {
    status: 'IDLE',
  },
};

const MOCK_NAME = 'name';

describe('AddCustomSourceLogic', () => {
  const { mount } = new LogicMounter(AddCustomSourceApiLogic);
  const { http } = mockHttpValues;
  const { clearFlashMessages } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    mount({});
  });

  it('has expected default values', () => {
    expect(AddCustomSourceApiLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('listeners', () => {
    beforeEach(() => {
      mount();
    });

    describe('organization context', () => {
      describe('createContentSource', () => {
        it('calls API and sets values', async () => {
          const addSourceSuccessSpy = jest.spyOn(
            AddCustomSourceApiLogic.actions,
            'addSourceSuccess'
          );
          http.post.mockReturnValue(Promise.resolve({ sourceConfigData }));

          AddCustomSourceApiLogic.actions.addSource(MOCK_NAME);

          expect(clearFlashMessages).toHaveBeenCalled();
          expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/org/create_source', {
            body: JSON.stringify({ service_type: 'custom', name: MOCK_NAME }),
          });
          await nextTick();
          expect(addSourceSuccessSpy).toHaveBeenCalledWith({ sourceConfigData });
        });

        it('submits a base service type for pre-configured sources', async () => {
          const addSourceSuccessSpy = jest.spyOn(
            AddCustomSourceApiLogic.actions,
            'addSourceSuccess'
          );
          http.post.mockReturnValue(Promise.resolve({ sourceConfigData }));

          AddCustomSourceApiLogic.actions.addSource(MOCK_NAME, 'base_service_type');

          expect(clearFlashMessages).toHaveBeenCalled();
          expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/org/create_source', {
            body: JSON.stringify({
              service_type: 'custom',
              name: MOCK_NAME,
              base_service_type: 'base_service_type',
            }),
          });
          await nextTick();
          expect(addSourceSuccessSpy).toHaveBeenCalledWith({ sourceConfigData });
        });

        itShowsServerErrorAsFlashMessage(http.post, () => {
          AddCustomSourceApiLogic.actions.addSource(MOCK_NAME);
        });
      });
    });

    describe('account context routes', () => {
      beforeEach(() => {
        AppLogic.values.isOrganization = false;
      });

      describe('createContentSource', () => {
        it('calls API and sets values', async () => {
          const addSourceSuccessSpy = jest.spyOn(
            AddCustomSourceApiLogic.actions,
            'addSourceSuccess'
          );
          http.post.mockReturnValue(Promise.resolve({ sourceConfigData }));

          AddCustomSourceApiLogic.actions.addSource(MOCK_NAME);

          expect(clearFlashMessages).toHaveBeenCalled();
          expect(http.post).toHaveBeenCalledWith(
            '/internal/workplace_search/account/create_source',
            {
              body: JSON.stringify({ service_type: 'custom', name: MOCK_NAME }),
            }
          );
          await nextTick();
          expect(addSourceSuccessSpy).toHaveBeenCalledWith({ sourceConfigData });
        });

        it('submits a base service type for pre-configured sources', async () => {
          const addSourceSuccessSpy = jest.spyOn(
            AddCustomSourceApiLogic.actions,
            'addSourceSuccess'
          );
          http.post.mockReturnValue(Promise.resolve({ sourceConfigData }));

          AddCustomSourceApiLogic.actions.addSource(MOCK_NAME, 'base_service_type');

          expect(clearFlashMessages).toHaveBeenCalled();
          expect(http.post).toHaveBeenCalledWith(
            '/internal/workplace_search/account/create_source',
            {
              body: JSON.stringify({
                service_type: 'custom',
                name: MOCK_NAME,
                base_service_type: 'base_service_type',
              }),
            }
          );
          await nextTick();
          expect(addSourceSuccessSpy).toHaveBeenCalledWith({ sourceConfigData });
        });

        itShowsServerErrorAsFlashMessage(http.post, () => {
          AddCustomSourceApiLogic.actions.addSource(MOCK_NAME);
        });
      });
    });
  });
});
