/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useCasesFromAlerts } from './use_cases_from_alerts';
import * as api from './api';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { mockCaseIdsFromAlertId } from './mock';

jest.mock('./api');
jest.mock('../../../../common/hooks/use_app_toasts');

describe('useCasesFromAlerts hook', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;
  beforeEach(() => {
    jest.resetAllMocks();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns an array of caseIds', async () => {
    const spyOnCases = jest.spyOn(api, 'getCaseIdsFromAlertId');
    const { result, waitForNextUpdate } = renderHook(() =>
      useCasesFromAlerts({ alertId: 'anAlertId' })
    );
    await waitForNextUpdate();
    expect(spyOnCases).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({
      loading: false,
      casesInfo: mockCaseIdsFromAlertId,
    });
  });
});
