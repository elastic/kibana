/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useKibana as mockUseKibana } from '../../lib/kibana/__mocks__';
import { kpiHostMetricLensAttributes } from './lens_attributes/hosts/kpi_host_metric';
import { useAddToExistingCase } from './use_add_to_existing_case';
import { useGetUserCasesPermissions } from '../../lib/kibana';

const mockedUseKibana = mockUseKibana();
const mockGetUseCasesAddToExistingCaseModal = jest.fn();

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
            getUseCasesAddToExistingCaseModal: mockGetUseCasesAddToExistingCaseModal,
          },
        },
      },
    }),
  };
});

describe('useAddToExistingCase', () => {
  const mockOnAddToCaseClicked = jest.fn();
  const timeRange = {
    from: '2022-03-06T16:00:00.000Z',
    to: '2022-03-07T15:59:59.999Z',
  };

  beforeEach(() => {
    (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
      crud: true,
      read: true,
    });
  });

  it('getUseCasesAddToExistingCaseModal with attachments', () => {
    const { result } = renderHook(() =>
      useAddToExistingCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange,
        onAddToCaseClicked: mockOnAddToCaseClicked,
      })
    );
    expect(mockGetUseCasesAddToExistingCaseModal).toHaveBeenCalledWith({
      onClose: mockOnAddToCaseClicked,
      toastContent: 'Successfully added visualization to the case',
    });
    expect(result.current.disabled).toEqual(false);
  });

  it("button disabled if user Can't Crud", () => {
    (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
      crud: false,
      read: true,
    });

    const { result } = renderHook(() =>
      useAddToExistingCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange,
        onAddToCaseClicked: mockOnAddToCaseClicked,
      })
    );
    expect(result.current.disabled).toEqual(true);
  });

  it('button disabled if no lensAttributes', () => {
    const { result } = renderHook(() =>
      useAddToExistingCase({
        lensAttributes: null,
        timeRange,
        onAddToCaseClicked: mockOnAddToCaseClicked,
      })
    );
    expect(result.current.disabled).toEqual(true);
  });

  it('button disabled if no timeRange', () => {
    const { result } = renderHook(() =>
      useAddToExistingCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange: null,
        onAddToCaseClicked: mockOnAddToCaseClicked,
      })
    );
    expect(result.current.disabled).toEqual(true);
  });
});
