/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { range } from 'lodash';
import { maybeRedirectToAvailableSpanSample } from './maybe_redirect_to_available_span_sample';
import { replace as urlHelpersReplace } from '../../shared/links/url_helpers';
import { History } from 'history';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';

describe('maybeRedirectToAvailableSpanSample', () => {
  const samples: Array<{
    spanId: string;
    traceId: string;
    transactionId: string;
  }> = range(11).map((_, index) => ({
    spanId: (index + 1).toString(),
    traceId: '',
    transactionId: '',
  }));

  let defaultParams: Omit<Parameters<typeof maybeRedirectToAvailableSpanSample>[0], 'replace'> & {
    replace: jest.MockedFunction<typeof urlHelpersReplace>;
  };

  beforeEach(() => {
    defaultParams = {
      samples,
      page: 0,
      pageSize: 10,
      history: {
        location: {
          search: '',
        },
      } as History,
      spanFetchStatus: FETCH_STATUS.SUCCESS,
      replace: jest.fn(),
    };
  });

  it('does not redirect while loading', () => {
    maybeRedirectToAvailableSpanSample({
      ...defaultParams,
      spanId: undefined,
      spanFetchStatus: FETCH_STATUS.LOADING,
    });
    expect(defaultParams.replace).not.toHaveBeenCalled();
  });

  it('redirects to the first available span if no span is selected', () => {
    maybeRedirectToAvailableSpanSample({
      ...defaultParams,
      spanId: undefined,
      page: 1,
      spanFetchStatus: FETCH_STATUS.SUCCESS,
    });
    expect(defaultParams.replace).toHaveBeenCalled();

    expect(defaultParams.replace.mock.calls[0][1].query).toEqual({
      spanId: samples[0].spanId,
      page: '0',
    });
  });

  it('redirects to the first available span if the currently selected sample is not found', () => {
    maybeRedirectToAvailableSpanSample({
      ...defaultParams,
      page: 1,
      spanId: '12',
      spanFetchStatus: FETCH_STATUS.SUCCESS,
    });
    expect(defaultParams.replace).toHaveBeenCalled();

    expect(defaultParams.replace.mock.calls[0][1].query).toEqual({
      spanId: samples[0].spanId,
      page: '0',
    });
  });

  it('does not redirect if the sample is found', () => {
    maybeRedirectToAvailableSpanSample({
      ...defaultParams,
      page: 0,
      spanId: '1',
      spanFetchStatus: FETCH_STATUS.SUCCESS,
    });
    expect(defaultParams.replace).not.toHaveBeenCalled();
  });

  it('redirects to the page of the currently selected sample', () => {
    maybeRedirectToAvailableSpanSample({
      ...defaultParams,
      page: 0,
      spanId: '11',
      spanFetchStatus: FETCH_STATUS.SUCCESS,
    });

    expect(defaultParams.replace).toHaveBeenCalled();

    expect(defaultParams.replace.mock.calls[0][1].query).toEqual({
      page: '1',
      spanId: '11',
    });
  });
});
