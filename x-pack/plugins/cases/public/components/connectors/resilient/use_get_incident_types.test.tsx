/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useKibana, useToasts } from '../../../common/lib/kibana';
import { connector } from '../mock';
import { useGetIncidentTypes } from './use_get_incident_types';
import * as api from './api';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';

jest.mock('../../../common/lib/kibana');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useGetIncidentTypes', () => {
  const { http } = useKibanaMock().services;
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'getIncidentTypes');
    const { waitForNextUpdate } = renderHook(
      () =>
        useGetIncidentTypes({
          http,
          connector,
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith({
      http,
      signal: expect.anything(),
      connectorId: connector.id,
    });
  });

  it('does not call the api when the connector is missing', async () => {
    const spy = jest.spyOn(api, 'getIncidentTypes');
    renderHook(
      () =>
        useGetIncidentTypes({
          http,
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    expect(spy).not.toHaveBeenCalledWith();
  });

  it('calls addError when the getIncidentTypes api throws an error', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getIncidentTypes');
    spyOnGetCases.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess: jest.fn(), addError });

    const { waitForNextUpdate } = renderHook(
      () =>
        useGetIncidentTypes({
          http,
          connector,
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitForNextUpdate();
    expect(addError).toHaveBeenCalled();
  });

  it('calls addError when the getIncidentTypes api returns successfully but contains an error', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getIncidentTypes');
    spyOnGetCases.mockResolvedValue({
      status: 'error',
      message: 'Error message',
      actionId: 'test',
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess: jest.fn(), addError });

    const { waitForNextUpdate } = renderHook(
      () =>
        useGetIncidentTypes({
          http,
          connector,
        }),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitForNextUpdate();
    expect(addError).toHaveBeenCalled();
  });
});
