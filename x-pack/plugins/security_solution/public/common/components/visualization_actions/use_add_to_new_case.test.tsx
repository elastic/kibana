/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useKibana as mockUseKibana } from '../../lib/kibana/__mocks__';
import { kpiHostMetricLensAttributes } from './lens_attributes/hosts/kpi_host_metric';
import { useAddToNewCase } from './use_add_to_new_case';
import { useGetUserCasesPermissions } from '../../lib/kibana';
import {
  allCasesPermissions,
  readCasesPermissions,
  writeCasesPermissions,
} from '../../../cases_test_utils';

jest.mock('../../lib/kibana/kibana_react');

const mockedUseKibana = mockUseKibana();
const mockGetUseCasesAddToNewCaseFlyout = jest.fn();

jest.mock('../../lib/kibana', () => {
  const original = jest.requireActual('../../lib/kibana');

  return {
    ...original,
    useGetUserCasesPermissions: jest.fn(),
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        cases: {
          hooks: {
            getUseCasesAddToNewCaseFlyout: mockGetUseCasesAddToNewCaseFlyout,
          },
        },
      },
    }),
  };
});

describe('useAddToNewCase', () => {
  const timeRange = {
    from: '2022-03-06T16:00:00.000Z',
    to: '2022-03-07T15:59:59.999Z',
  };
  beforeEach(() => {
    (useGetUserCasesPermissions as jest.Mock).mockReturnValue(allCasesPermissions());
  });

  it('getUseCasesAddToNewCaseFlyout with attachments', () => {
    const { result } = renderHook(() =>
      useAddToNewCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange,
      })
    );
    expect(mockGetUseCasesAddToNewCaseFlyout).toHaveBeenCalledWith({
      toastContent: 'Successfully added visualization to the case',
    });
    expect(result.current.disabled).toEqual(false);
  });

  it("disables the button if the user can't create but can read", () => {
    (useGetUserCasesPermissions as jest.Mock).mockReturnValue(readCasesPermissions());

    const { result } = renderHook(() =>
      useAddToNewCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange,
      })
    );
    expect(result.current.disabled).toEqual(true);
  });

  it("disables the button if the user can't read but can create", () => {
    (useGetUserCasesPermissions as jest.Mock).mockReturnValue(writeCasesPermissions());

    const { result } = renderHook(() =>
      useAddToNewCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange,
      })
    );
    expect(result.current.disabled).toEqual(true);
  });

  it('button disabled if no lensAttributes', () => {
    const { result } = renderHook(() =>
      useAddToNewCase({
        lensAttributes: null,
        timeRange,
      })
    );
    expect(result.current.disabled).toEqual(true);
  });

  it('button disabled if no timeRange', () => {
    const { result } = renderHook(() =>
      useAddToNewCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange: null,
      })
    );
    expect(result.current.disabled).toEqual(true);
  });
});
