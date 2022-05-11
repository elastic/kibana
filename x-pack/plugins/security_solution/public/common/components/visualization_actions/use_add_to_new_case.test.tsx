/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { useKibana } from '../../lib/kibana';
import { kpiHostMetricLensAttributes } from './lens_attributes/hosts/kpi_host_metric';
import { useAddToNewCase } from './use_add_to_new_case';

jest.mock('../../lib/kibana/kibana_react');

describe('useAddToNewCase', () => {
  const mockCases = mockCasesContract();
  const timeRange = {
    from: '2022-03-06T16:00:00.000Z',
    to: '2022-03-07T15:59:59.999Z',
  };
  const owner = 'securitySolution';
  const type = 'user';
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: mockCases,
      },
    });
  });

  it('getUseCasesAddToNewCaseFlyout with attachments', () => {
    const { result } = renderHook(() =>
      useAddToNewCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange,
        userCanCrud: true,
      })
    );
    expect(mockCases.hooks.getUseCasesAddToNewCaseFlyout).toHaveBeenCalledWith({
      attachments: [
        {
          comment: `!{lens${JSON.stringify({
            timeRange,
            attributes: kpiHostMetricLensAttributes,
          })}}`,
          owner,
          type,
        },
      ],
      toastContent: 'Successfully added visualization to the case',
    });
    expect(result.current.disabled).toEqual(false);
  });

  it("button disalbled if user Can't Crud", () => {
    const { result } = renderHook(() =>
      useAddToNewCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange,
        userCanCrud: false,
      })
    );
    expect(result.current.disabled).toEqual(true);
  });

  it('button disalbled if no lensAttributes', () => {
    const { result } = renderHook(() =>
      useAddToNewCase({
        lensAttributes: null,
        timeRange,
        userCanCrud: true,
      })
    );
    expect(result.current.disabled).toEqual(true);
  });

  it('button disalbled if no timeRange', () => {
    const { result } = renderHook(() =>
      useAddToNewCase({
        lensAttributes: kpiHostMetricLensAttributes,
        timeRange: null,
        userCanCrud: true,
      })
    );
    expect(result.current.disabled).toEqual(true);
  });
});
