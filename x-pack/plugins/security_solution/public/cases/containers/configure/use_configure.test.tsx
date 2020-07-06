/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import {
  initialState,
  useCaseConfigure,
  ReturnUseCaseConfigure,
  ConnectorConfiguration,
} from './use_configure';
import { mapping, caseConfigurationCamelCaseResponseMock } from './mock';
import * as api from './api';

jest.mock('./api');

const configuration: ConnectorConfiguration = {
  connectorId: '456',
  connectorName: 'My Connector 2',
  closureType: 'close-by-pushing',
};

describe('useConfigure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        ...initialState,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        persistCaseConfigure: result.current.persistCaseConfigure,
        setCurrentConfiguration: result.current.setCurrentConfiguration,
        setConnector: result.current.setConnector,
        setClosureType: result.current.setClosureType,
        setMapping: result.current.setMapping,
      });
    });
  });

  test('fetch case configuration', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        ...initialState,
        closureType: caseConfigurationCamelCaseResponseMock.closureType,
        connectorId: caseConfigurationCamelCaseResponseMock.connectorId,
        connectorName: caseConfigurationCamelCaseResponseMock.connectorName,
        currentConfiguration: {
          closureType: caseConfigurationCamelCaseResponseMock.closureType,
          connectorId: caseConfigurationCamelCaseResponseMock.connectorId,
          connectorName: caseConfigurationCamelCaseResponseMock.connectorName,
        },
        version: caseConfigurationCamelCaseResponseMock.version,
        firstLoad: true,
        loading: false,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        persistCaseConfigure: result.current.persistCaseConfigure,
        setCurrentConfiguration: result.current.setCurrentConfiguration,
        setConnector: result.current.setConnector,
        setClosureType: result.current.setClosureType,
        setMapping: result.current.setMapping,
      });
    });
  });

  test('refetch case configuration', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getCaseConfigure');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.refetchCaseConfigure();
      expect(spyOnGetCaseConfigure).toHaveBeenCalledTimes(2);
    });
  });

  test('correctly sets mappings', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current.mapping).toEqual(null);
      result.current.setMapping(mapping);
      expect(result.current.mapping).toEqual(mapping);
    });
  });

  test('set isLoading to true when fetching case configuration', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.refetchCaseConfigure();

      expect(result.current.loading).toBe(true);
    });
  });

  test('persist case configuration', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.persistCaseConfigure(configuration);
      expect(result.current.persistLoading).toBeTruthy();
    });
  });

  test('save case configuration - postCaseConfigure', async () => {
    // When there is no version, a configuration is created. Otherwise is updated.
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getCaseConfigure');
    spyOnGetCaseConfigure.mockImplementation(() =>
      Promise.resolve({
        ...caseConfigurationCamelCaseResponseMock,
        version: '',
      })
    );

    const spyOnPostCaseConfigure = jest.spyOn(api, 'postCaseConfigure');
    spyOnPostCaseConfigure.mockImplementation(() =>
      Promise.resolve({
        ...caseConfigurationCamelCaseResponseMock,
        ...configuration,
      })
    );

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      result.current.persistCaseConfigure(configuration);

      expect(result.current.connectorId).toEqual('123');
      await waitForNextUpdate();
      expect(result.current.connectorId).toEqual('456');
    });
  });

  test('save case configuration - patchCaseConfigure', async () => {
    const spyOnPatchCaseConfigure = jest.spyOn(api, 'patchCaseConfigure');
    spyOnPatchCaseConfigure.mockImplementation(() =>
      Promise.resolve({
        ...caseConfigurationCamelCaseResponseMock,
        ...configuration,
      })
    );

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      result.current.persistCaseConfigure(configuration);

      expect(result.current.connectorId).toEqual('123');
      await waitForNextUpdate();
      expect(result.current.connectorId).toEqual('456');
    });
  });

  test('unhappy path - fetch case configuration', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getCaseConfigure');
    spyOnGetCaseConfigure.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure()
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        ...initialState,
        loading: false,
        persistLoading: false,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        persistCaseConfigure: result.current.persistCaseConfigure,
        setCurrentConfiguration: result.current.setCurrentConfiguration,
        setConnector: result.current.setConnector,
        setClosureType: result.current.setClosureType,
        setMapping: result.current.setMapping,
      });
    });
  });

  test('unhappy path - persist case configuration', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getCaseConfigure');
    spyOnGetCaseConfigure.mockImplementation(() =>
      Promise.resolve({
        ...caseConfigurationCamelCaseResponseMock,
        version: '',
      })
    );
    const spyOnPostCaseConfigure = jest.spyOn(api, 'postCaseConfigure');
    spyOnPostCaseConfigure.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure()
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      result.current.persistCaseConfigure(configuration);

      expect(result.current).toEqual({
        ...initialState,
        closureType: caseConfigurationCamelCaseResponseMock.closureType,
        connectorId: caseConfigurationCamelCaseResponseMock.connectorId,
        connectorName: caseConfigurationCamelCaseResponseMock.connectorName,
        currentConfiguration: {
          closureType: caseConfigurationCamelCaseResponseMock.closureType,
          connectorId: caseConfigurationCamelCaseResponseMock.connectorId,
          connectorName: caseConfigurationCamelCaseResponseMock.connectorName,
        },
        firstLoad: true,
        loading: false,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        persistCaseConfigure: result.current.persistCaseConfigure,
        setCurrentConfiguration: result.current.setCurrentConfiguration,
        setConnector: result.current.setConnector,
        setClosureType: result.current.setClosureType,
        setMapping: result.current.setMapping,
      });
    });
  });
});
