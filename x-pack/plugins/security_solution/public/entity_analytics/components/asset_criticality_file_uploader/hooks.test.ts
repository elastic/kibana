/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';
import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import { waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { useFileValidation } from './hooks';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';

const mockedUseKibana = mockUseKibana();
const mockedTelemetry = createTelemetryServiceMock();

jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        telemetry: mockedTelemetry,
      },
    }),
  };
});

describe('useFileValidation', () => {
  const validLine = 'user,user-001,low_impact';
  const invalidLine = 'user,user-001,low_impact,extra_field';

  test('should call onError when an error occurs', () => {
    const onErrorMock = jest.fn();
    const onCompleteMock = jest.fn();

    const { result } = renderHook(
      () => useFileValidation({ onError: onErrorMock, onComplete: onCompleteMock }),
      { wrapper: TestProviders }
    );
    result.current(new File([invalidLine], 'test.csv'));

    expect(onErrorMock).toHaveBeenCalled();
    expect(onCompleteMock).not.toHaveBeenCalled();
  });

  test('should call onComplete when file validation is complete', async () => {
    const onErrorMock = jest.fn();
    const onCompleteMock = jest.fn();
    const fileName = 'test.csv';

    const { result } = renderHook(
      () => useFileValidation({ onError: onErrorMock, onComplete: onCompleteMock }),
      { wrapper: TestProviders }
    );
    result.current(new File([`${validLine}\n${invalidLine}`], fileName, { type: 'text/csv' }));

    await waitFor(() => {
      expect(onErrorMock).not.toHaveBeenCalled();
      expect(onCompleteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedFile: {
            name: fileName,
            size: 61,
            validLines: {
              text: validLine,
              count: 1,
            },
            invalidLines: {
              text: invalidLine,
              count: 1,
              errors: [
                {
                  message: 'Expected 3 columns, got 4',
                  index: 1,
                },
              ],
            },
          },
          processingEndTime: expect.any(String),
          processingStartTime: expect.any(String),
          tookMs: expect.any(Number),
        })
      );
    });
  });
});
