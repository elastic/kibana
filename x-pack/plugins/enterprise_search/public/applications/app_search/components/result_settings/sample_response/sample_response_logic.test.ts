/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues } from '../../../../__mocks__/kea_logic';
import '../../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { flashAPIErrors } from '../../../../shared/flash_messages';

import { SampleResponseLogic } from './sample_response_logic';

describe('SampleResponseLogic', () => {
  const { mount } = new LogicMounter(SampleResponseLogic);
  const { http } = mockHttpValues;

  const DEFAULT_VALUES = {
    query: '',
    response: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(SampleResponseLogic.values).toEqual({
      ...DEFAULT_VALUES,
    });
  });

  describe('actions', () => {
    describe('queryChanged', () => {
      it('updates the query', () => {
        mount({
          query: '',
        });

        SampleResponseLogic.actions.queryChanged('foo');

        expect(SampleResponseLogic.values).toEqual({
          ...DEFAULT_VALUES,
          query: 'foo',
        });
      });
    });

    describe('getSearchResultsSuccess', () => {
      it('sets the response from a search API request', () => {
        mount({
          response: null,
        });

        SampleResponseLogic.actions.getSearchResultsSuccess({});

        expect(SampleResponseLogic.values).toEqual({
          ...DEFAULT_VALUES,
          response: {},
        });
      });
    });

    describe('getSearchResultsFailure', () => {
      it('sets a string response from a search API request', () => {
        mount({
          response: null,
        });

        SampleResponseLogic.actions.getSearchResultsFailure('An error occured.');

        expect(SampleResponseLogic.values).toEqual({
          ...DEFAULT_VALUES,
          response: 'An error occured.',
        });
      });
    });
  });

  describe('listeners', () => {
    describe('getSearchResults', () => {
      beforeAll(() => jest.useFakeTimers());
      afterAll(() => jest.useRealTimers());

      it('makes a search API request and calls getSearchResultsSuccess with the first result of the response', async () => {
        mount();
        jest.spyOn(SampleResponseLogic.actions, 'getSearchResultsSuccess');

        http.post.mockReturnValue(
          Promise.resolve({
            results: [
              { id: { raw: 'foo' }, _meta: {} },
              { id: { raw: 'bar' }, _meta: {} },
              { id: { raw: 'baz' }, _meta: {} },
            ],
          })
        );

        SampleResponseLogic.actions.getSearchResults('foo', { foo: { raw: true } });
        jest.runAllTimers();
        await nextTick();

        expect(SampleResponseLogic.actions.getSearchResultsSuccess).toHaveBeenCalledWith({
          // Note that the _meta field was stripped from the result
          id: { raw: 'foo' },
        });
      });

      it('calls getSearchResultsSuccess with a "No Results." message if there are no results', async () => {
        mount();
        jest.spyOn(SampleResponseLogic.actions, 'getSearchResultsSuccess');

        http.post.mockReturnValue(
          Promise.resolve({
            results: [],
          })
        );

        SampleResponseLogic.actions.getSearchResults('foo', { foo: { raw: true } });
        jest.runAllTimers();
        await nextTick();

        expect(SampleResponseLogic.actions.getSearchResultsSuccess).toHaveBeenCalledWith(
          'No results.'
        );
      });

      it('handles 500 errors by setting a generic error response and showing a flash message error', async () => {
        mount();
        jest.spyOn(SampleResponseLogic.actions, 'getSearchResultsFailure');

        const error = {
          response: {
            status: 500,
          },
        };

        http.post.mockReturnValueOnce(Promise.reject(error));

        SampleResponseLogic.actions.getSearchResults('foo', { foo: { raw: true } });
        jest.runAllTimers();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith(error);
        expect(SampleResponseLogic.actions.getSearchResultsFailure).toHaveBeenCalledWith(
          'An error occured.'
        );
      });

      it('handles 400 errors by setting the response, but does not show a flash error message', async () => {
        mount();
        jest.spyOn(SampleResponseLogic.actions, 'getSearchResultsFailure');

        http.post.mockReturnValueOnce(
          Promise.reject({
            response: {
              status: 400,
            },
            body: {
              attributes: {
                errors: ['A validation error occurred.'],
              },
            },
          })
        );

        SampleResponseLogic.actions.getSearchResults('foo', { foo: { raw: true } });
        jest.runAllTimers();
        await nextTick();

        expect(SampleResponseLogic.actions.getSearchResultsFailure).toHaveBeenCalledWith({
          errors: ['A validation error occurred.'],
        });
      });

      it('sets a generic message on a 400 error if no custom message is provided in the response', async () => {
        mount();
        jest.spyOn(SampleResponseLogic.actions, 'getSearchResultsFailure');

        http.post.mockReturnValueOnce(
          Promise.reject({
            response: {
              status: 400,
            },
          })
        );

        SampleResponseLogic.actions.getSearchResults('foo', { foo: { raw: true } });
        jest.runAllTimers();
        await nextTick();

        expect(SampleResponseLogic.actions.getSearchResultsFailure).toHaveBeenCalledWith(
          'An error occured.'
        );
      });
    });
  });
});
