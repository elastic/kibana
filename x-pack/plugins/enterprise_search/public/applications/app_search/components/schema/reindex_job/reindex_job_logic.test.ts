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
} from '../../../../__mocks__/kea_logic';
import '../../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { ReindexJobLogic } from './reindex_job_logic';

describe('ReindexJobLogic', () => {
  const { mount } = new LogicMounter(ReindexJobLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors } = mockFlashMessageHelpers;

  const MOCK_RESPONSE = {
    fieldCoercionErrors: {
      some_erroring_field: [
        {
          id: 'document-1',
          error: "Value 'some text' cannot be parsed as a number",
        },
      ],
      another_erroring_field: [
        {
          id: 'document-2',
          error: "Value '123' cannot be parsed as a date",
        },
      ],
    },
  };

  const DEFAULT_VALUES = {
    dataLoading: true,
    fieldCoercionErrors: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(ReindexJobLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onLoadSuccess', () => {
      it('stores fieldCoercionErrors state and sets dataLoading to false', () => {
        mount({ fieldCoercionErrors: {}, dataLoading: true });

        ReindexJobLogic.actions.onLoadSuccess(MOCK_RESPONSE);

        expect(ReindexJobLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          fieldCoercionErrors: MOCK_RESPONSE.fieldCoercionErrors,
        });
      });
    });

    describe('onLoadError', () => {
      it('sets dataLoading to false', () => {
        mount({ dataLoading: true });

        ReindexJobLogic.actions.onLoadError();

        expect(ReindexJobLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('loadReindexJob', () => {
      it('sets dataLoading to true', () => {
        mount({ dataLoading: false });

        ReindexJobLogic.actions.loadReindexJob('some-job-id');

        expect(ReindexJobLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
        });
      });

      it('should make an API call and then set schema state', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_RESPONSE));
        mount();
        jest.spyOn(ReindexJobLogic.actions, 'onLoadSuccess');

        ReindexJobLogic.actions.loadReindexJob('some-job-id');
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/reindex_job/some-job-id'
        );
        expect(ReindexJobLogic.actions.onLoadSuccess).toHaveBeenCalledWith(MOCK_RESPONSE);
      });

      it('handles errors', async () => {
        http.get.mockReturnValueOnce(Promise.reject('error'));
        mount();
        jest.spyOn(ReindexJobLogic.actions, 'onLoadError');

        ReindexJobLogic.actions.loadReindexJob('some-bad-id');
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
        expect(ReindexJobLogic.actions.onLoadError).toHaveBeenCalled();
      });
    });
  });
});
