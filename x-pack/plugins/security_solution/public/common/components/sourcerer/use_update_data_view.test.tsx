/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useUpdateDataView } from './use_update_data_view';
import { useKibana as mockUseKibana } from '../../lib/kibana/__mocks__';
import * as i18n from './translations';
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const mockPatterns = ['packetbeat-*', 'winlogbeat-*'];
const mockedUseKibana = mockUseKibana();
jest.mock('../../hooks/use_app_toasts', () => {
  const original = jest.requireActual('../../hooks/use_app_toasts');

  return {
    ...original,
    useAppToasts: () => ({
      addSuccess: mockAddSuccess,
      addError: mockAddError,
    }),
  };
});
jest.mock('../../lib/kibana', () => {
  return {
    useKibana: () => mockedUseKibana,
  };
});
jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');

  return {
    ...original,
    toMountPoint: jest.fn(),
  };
});
describe('use_update_data_view', () => {
  const mockError = jest.fn();

  beforeEach(() => {
    mockedUseKibana.services.uiSettings.get.mockImplementation(() => mockPatterns);
    mockedUseKibana.services.uiSettings.set.mockResolvedValue(true);
    jest.clearAllMocks();
  });

  test('Successful uiSettings updates with correct index pattern, and shows success toast', async () => {
    const { result } = renderHook(() => useUpdateDataView(mockError));
    const updateDataView = result.current;
    const isUiSettingsSuccess = await updateDataView(['missing-*']);
    expect(mockedUseKibana.services.uiSettings.set.mock.calls[0][1]).toEqual(
      [...mockPatterns, 'missing-*'].sort()
    );
    expect(isUiSettingsSuccess).toEqual(true);
    expect(mockAddSuccess).toHaveBeenCalled();
  });

  test('Failed uiSettings update returns false and shows error toast', async () => {
    mockedUseKibana.services.uiSettings.set.mockImplementation(() => false);
    const { result } = renderHook(() => useUpdateDataView(mockError));
    const updateDataView = result.current;
    const isUiSettingsSuccess = await updateDataView(['missing-*']);
    expect(mockedUseKibana.services.uiSettings.set.mock.calls[0][1]).toEqual(
      [...mockPatterns, 'missing-*'].sort()
    );
    expect(isUiSettingsSuccess).toEqual(false);
    expect(mockAddError).toHaveBeenCalled();
    expect(mockAddError.mock.calls[0][0]).toEqual(new Error(i18n.FAILURE_TOAST_TITLE));
  });

  test('Failed uiSettings throws error and shows error toast', async () => {
    mockedUseKibana.services.uiSettings.get.mockImplementation(() => {
      throw new Error('Uh oh bad times over here');
    });
    const { result } = renderHook(() => useUpdateDataView(mockError));
    const updateDataView = result.current;
    const isUiSettingsSuccess = await updateDataView(['missing-*']);
    expect(isUiSettingsSuccess).toEqual(false);
    expect(mockAddError).toHaveBeenCalled();
    expect(mockAddError.mock.calls[0][0]).toEqual(new Error('Uh oh bad times over here'));
  });
});
