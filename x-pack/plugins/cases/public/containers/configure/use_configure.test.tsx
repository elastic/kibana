/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import {
  initialState,
  useCaseConfigure,
  ReturnUseCaseConfigure,
  ConnectorConfiguration,
} from './use_configure';
import { mappings, caseConfigurationCamelCaseResponseMock } from './mock';
import * as api from './api';
import { ConnectorTypes } from '../../../common/api';
import { TestProviders } from '../../common/mock';

const mockErrorToast = jest.fn();
const mockSuccessToast = jest.fn();
jest.mock('./api');
jest.mock('../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../common/lib/kibana');
  return {
    ...originalModule,
    useToasts: () => {
      return {
        addError: mockErrorToast,
        addSuccess: mockSuccessToast,
      };
    },
  };
});
const configuration: ConnectorConfiguration = {
  connector: {
    id: '456',
    name: 'My connector 2',
    type: ConnectorTypes.none,
    fields: null,
  },
  closureType: 'close-by-pushing',
};

describe('useConfigure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('init', async () => {
    const { result } = renderHook<string, ReturnUseCaseConfigure>(() => useCaseConfigure(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    await act(async () =>
      expect(result.current).toEqual({
        ...initialState,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        persistCaseConfigure: result.current.persistCaseConfigure,
        setCurrentConfiguration: result.current.setCurrentConfiguration,
        setConnector: result.current.setConnector,
        setClosureType: result.current.setClosureType,
        setMappings: result.current.setMappings,
      })
    );
  });

  test('fetch case configuration', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(
        () => useCaseConfigure(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        ...initialState,
        closureType: caseConfigurationCamelCaseResponseMock.closureType,
        connector: caseConfigurationCamelCaseResponseMock.connector,
        currentConfiguration: {
          closureType: caseConfigurationCamelCaseResponseMock.closureType,
          connector: caseConfigurationCamelCaseResponseMock.connector,
        },
        mappings: [],
        firstLoad: true,
        loading: false,
        persistCaseConfigure: result.current.persistCaseConfigure,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        setClosureType: result.current.setClosureType,
        setConnector: result.current.setConnector,
        setCurrentConfiguration: result.current.setCurrentConfiguration,
        setMappings: result.current.setMappings,
        version: caseConfigurationCamelCaseResponseMock.version,
        id: caseConfigurationCamelCaseResponseMock.id,
      });
    });
  });

  test('refetch case configuration', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getCaseConfigure');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(
        () => useCaseConfigure(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      result.current.refetchCaseConfigure();
      expect(spyOnGetCaseConfigure).toHaveBeenCalledTimes(2);
    });
  });

  test('correctly sets mappings', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(
        () => useCaseConfigure(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      expect(result.current.mappings).toEqual([]);
      result.current.setMappings(mappings);
      expect(result.current.mappings).toEqual(mappings);
    });
  });

  test('set isLoading to true when fetching case configuration', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(
        () => useCaseConfigure(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      result.current.refetchCaseConfigure();

      expect(result.current.loading).toBe(true);
    });
  });

  test('persist case configuration', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(
        () => useCaseConfigure(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
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
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(
        () => useCaseConfigure(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      expect(mockErrorToast).not.toHaveBeenCalled();

      result.current.persistCaseConfigure(configuration);

      expect(result.current.connector.id).toEqual('123');
      await waitForNextUpdate();
      expect(result.current.connector.id).toEqual('456');
    });
  });

  test('Displays error when present - getCaseConfigure', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getCaseConfigure');
    spyOnGetCaseConfigure.mockImplementation(() =>
      Promise.resolve({
        ...caseConfigurationCamelCaseResponseMock,
        error: 'uh oh homeboy',
        version: '',
      })
    );

    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(
        () => useCaseConfigure(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      expect(mockErrorToast).toHaveBeenCalled();
    });
  });

  test('Displays error when present - postCaseConfigure', async () => {
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
        error: 'uh oh homeboy',
      })
    );

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(
        () => useCaseConfigure(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      expect(mockErrorToast).not.toHaveBeenCalled();

      result.current.persistCaseConfigure(configuration);
      expect(mockErrorToast).not.toHaveBeenCalled();
      await waitForNextUpdate();
      expect(mockErrorToast).toHaveBeenCalled();
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
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(
        () => useCaseConfigure(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();

      result.current.persistCaseConfigure(configuration);

      expect(result.current.connector.id).toEqual('123');
      await waitForNextUpdate();
      expect(result.current.connector.id).toEqual('456');
    });
  });

  test('unhappy path - fetch case configuration', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getCaseConfigure');
    spyOnGetCaseConfigure.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(
        () => useCaseConfigure(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );

      await waitForNextUpdate();

      expect(result.current).toEqual({
        ...initialState,
        loading: false,
        persistCaseConfigure: result.current.persistCaseConfigure,
        persistLoading: false,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        setClosureType: result.current.setClosureType,
        setConnector: result.current.setConnector,
        setCurrentConfiguration: result.current.setCurrentConfiguration,
        setMappings: result.current.setMappings,
      });
    });
  });

  test('unhappy path - persist case configuration', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getCaseConfigure');
    spyOnGetCaseConfigure.mockImplementation(() =>
      Promise.resolve({
        ...caseConfigurationCamelCaseResponseMock,
        version: '',
        id: '',
      })
    );
    const spyOnPostCaseConfigure = jest.spyOn(api, 'postCaseConfigure');
    spyOnPostCaseConfigure.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(
        () => useCaseConfigure(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );

      await waitForNextUpdate();

      result.current.persistCaseConfigure(configuration);

      expect(result.current).toEqual({
        ...initialState,
        closureType: caseConfigurationCamelCaseResponseMock.closureType,
        connector: caseConfigurationCamelCaseResponseMock.connector,
        currentConfiguration: {
          closureType: caseConfigurationCamelCaseResponseMock.closureType,
          connector: caseConfigurationCamelCaseResponseMock.connector,
        },
        firstLoad: true,
        loading: false,
        mappings: [],
        persistCaseConfigure: result.current.persistCaseConfigure,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        setClosureType: result.current.setClosureType,
        setConnector: result.current.setConnector,
        setCurrentConfiguration: result.current.setCurrentConfiguration,
        setMappings: result.current.setMappings,
      });
    });
  });
});
