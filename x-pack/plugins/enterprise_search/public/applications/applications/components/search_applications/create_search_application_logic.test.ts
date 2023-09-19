/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { HttpError, Status } from '../../../../../common/types/api';

import { KibanaLogic } from '../../../shared/kibana';
import { CreateSearchApplicationApiLogic } from '../../api/search_applications/create_search_application_api_logic';

import { SEARCH_APPLICATIONS_PATH } from '../../routes';

import {
  CreateSearchApplicationLogic,
  CreateSearchApplicationLogicValues,
} from './create_search_application_logic';

const DEFAULT_VALUES: CreateSearchApplicationLogicValues = {
  createDisabled: true,
  createSearchApplicationError: undefined,
  createSearchApplicationStatus: Status.IDLE,
  formDisabled: false,
  indicesStatus: 'incomplete',
  searchApplicationName: '',
  searchApplicationNameStatus: 'incomplete',
  selectedIndices: [],
};

const VALID_SEARCH_APPLICATION_NAME = 'unit-test-001';
const INVALID_SEARCH_APPLICATION_NAME = 'TEST';
const VALID_INDICES_DATA = ['search-index-01'];

describe('CreateSearchApplicationLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(CreateSearchApplicationApiLogic);
  const { mount } = new LogicMounter(CreateSearchApplicationLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    apiLogicMount();
    mount();
  });

  it('has expected defaults', () => {
    expect(CreateSearchApplicationLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('listeners', () => {
    it('createSearchApplication makes expected request action with VALID_SEARCH_APPLICATION_NAME', () => {
      jest.spyOn(CreateSearchApplicationLogic.actions, 'createSearchApplicationRequest');

      CreateSearchApplicationLogic.actions.setName(VALID_SEARCH_APPLICATION_NAME);
      CreateSearchApplicationLogic.actions.setSelectedIndices(VALID_INDICES_DATA);

      CreateSearchApplicationLogic.actions.createSearchApplication();

      expect(
        CreateSearchApplicationLogic.actions.createSearchApplicationRequest
      ).toHaveBeenCalledTimes(1);
      expect(
        CreateSearchApplicationLogic.actions.createSearchApplicationRequest
      ).toHaveBeenCalledWith({
        indices: ['search-index-01'],
        name: VALID_SEARCH_APPLICATION_NAME,
      });
    });

    it('createSearchApplication makes expected request action with INVALID_SEARCH_APPLICATION_NAME', () => {
      jest.spyOn(CreateSearchApplicationLogic.actions, 'createSearchApplicationRequest');

      CreateSearchApplicationLogic.actions.setName(INVALID_SEARCH_APPLICATION_NAME);
      CreateSearchApplicationLogic.actions.setSelectedIndices(VALID_INDICES_DATA);

      CreateSearchApplicationLogic.actions.createSearchApplication();

      expect(
        CreateSearchApplicationLogic.actions.createSearchApplicationRequest
      ).toHaveBeenCalledTimes(1);
      expect(
        CreateSearchApplicationLogic.actions.createSearchApplicationRequest
      ).toHaveBeenCalledWith({
        indices: ['search-index-01'],
        name: INVALID_SEARCH_APPLICATION_NAME,
      });
    });
    it('createSearchApplication returns error when duplicate search application is created', () => {
      const httpError: HttpError = {
        body: {
          error: 'search_application_already_exists',
          message: 'Search application name already taken. Choose another name.',
          statusCode: 409,
        },
        fetchOptions: {},
        request: {},
      } as HttpError;
      CreateSearchApplicationApiLogic.actions.apiError(httpError);
      expect(CreateSearchApplicationLogic.values.createSearchApplicationError).toEqual(httpError);
    });

    it('searchApplicationCreated is handled and is navigated to Search application list page', () => {
      jest.spyOn(CreateSearchApplicationLogic.actions, 'fetchSearchApplications');
      jest
        .spyOn(KibanaLogic.values, 'navigateToUrl')
        .mockImplementationOnce(() => Promise.resolve());
      CreateSearchApplicationApiLogic.actions.apiSuccess({
        result: 'created',
      });
      expect(KibanaLogic.values.navigateToUrl).toHaveBeenCalledWith(SEARCH_APPLICATIONS_PATH);

      expect(CreateSearchApplicationLogic.actions.fetchSearchApplications).toHaveBeenCalledTimes(1);
    });
  });
  describe('selectors', () => {
    describe('searchApplicationNameStatus', () => {
      it('returns incomplete with empty search application name', () => {
        expect(CreateSearchApplicationLogic.values.searchApplicationNameStatus).toEqual(
          'incomplete'
        );
      });
      it('returns complete with valid search application name', () => {
        CreateSearchApplicationLogic.actions.setName(VALID_SEARCH_APPLICATION_NAME);

        expect(CreateSearchApplicationLogic.values.searchApplicationNameStatus).toEqual('complete');
      });
      it('returns complete with invalid search application name', () => {
        CreateSearchApplicationLogic.actions.setName(INVALID_SEARCH_APPLICATION_NAME);
        expect(CreateSearchApplicationLogic.values.searchApplicationNameStatus).toEqual('complete');
      });
    });
    describe('indicesStatus', () => {
      it('returns incomplete with 0 indices', () => {
        expect(CreateSearchApplicationLogic.values.indicesStatus).toEqual('incomplete');
      });
      it('returns complete with at least one index', () => {
        CreateSearchApplicationLogic.actions.setSelectedIndices(VALID_INDICES_DATA);
        expect(CreateSearchApplicationLogic.values.indicesStatus).toEqual('complete');
      });
    });
    describe('createDisabled', () => {
      it('false with valid data', () => {
        CreateSearchApplicationLogic.actions.setSelectedIndices(VALID_INDICES_DATA);
        CreateSearchApplicationLogic.actions.setName(VALID_SEARCH_APPLICATION_NAME);

        expect(CreateSearchApplicationLogic.values.createDisabled).toEqual(false);
      });
      it('false with invalid data', () => {
        CreateSearchApplicationLogic.actions.setSelectedIndices(VALID_INDICES_DATA);
        CreateSearchApplicationLogic.actions.setName(INVALID_SEARCH_APPLICATION_NAME);

        expect(CreateSearchApplicationLogic.values.createDisabled).toEqual(false);
      });
    });
    describe('formDisabled', () => {
      it('returns true while create request in progress', () => {
        CreateSearchApplicationApiLogic.actions.makeRequest({
          indices: [VALID_INDICES_DATA[0]],
          name: VALID_SEARCH_APPLICATION_NAME,
        });

        expect(CreateSearchApplicationLogic.values.formDisabled).toEqual(true);
      });
    });
  });
});
