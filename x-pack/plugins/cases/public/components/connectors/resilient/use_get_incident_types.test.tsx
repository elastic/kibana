/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useKibana } from '../../../common/lib/kibana';
import { connector } from '../mock';
import type { UseGetIncidentTypes } from './use_get_incident_types';
import { useGetIncidentTypes } from './use_get_incident_types';
import * as api from './api';

jest.mock('../../../common/lib/kibana');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useGetIncidentTypes', () => {
  const { http, notifications } = useKibanaMock().services;

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetIncidentTypes>(() =>
        useGetIncidentTypes({ http, toastNotifications: notifications.toasts })
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({ isLoading: true, incidentTypes: [] });
    });
  });

  test('fetch incident types', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetIncidentTypes>(() =>
        useGetIncidentTypes({
          http,
          toastNotifications: notifications.toasts,
          connector,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        incidentTypes: [
          { id: 17, name: 'Communication error (fax; email)' },
          { id: 1001, name: 'Custom type' },
        ],
      });
    });
  });

  test('unhappy path', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getIncidentTypes');
    spyOnGetCaseConfigure.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetIncidentTypes>(() =>
        useGetIncidentTypes({ http, toastNotifications: notifications.toasts, connector })
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({ isLoading: false, incidentTypes: [] });
    });
  });
});
