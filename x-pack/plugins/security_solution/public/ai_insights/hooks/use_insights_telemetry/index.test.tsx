/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useInsightsTelemetry } from '.';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';

const reportInsightsGenerated = jest.fn();
const mockedTelemetry = {
  ...createTelemetryServiceMock(),
  reportInsightsGenerated,
};

jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
      },
    }),
  };
});

describe('useInsightsTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return the expected telemetry object with tracking functions', () => {
    const { result } = renderHook(() => useInsightsTelemetry());
    expect(result.current).toHaveProperty('reportInsightsGenerated');
  });

  it('Should call reportInsightsGenerated with appropriate actionTypeId when tracking is called', async () => {
    const { result } = renderHook(() => useInsightsTelemetry());
    await result.current.reportInsightsGenerated({ actionTypeId: '.gen-ai', model: 'gpt-4' });
    expect(reportInsightsGenerated).toHaveBeenCalledWith({
      actionTypeId: '.gen-ai',
      model: 'gpt-4',
    });
  });
});
