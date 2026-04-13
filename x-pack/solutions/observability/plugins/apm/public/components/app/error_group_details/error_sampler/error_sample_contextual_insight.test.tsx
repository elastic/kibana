/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ErrorSampleContextualInsight } from './error_sample_contextual_insight';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

jest.mock('../../../../context/apm_plugin/use_apm_plugin_context');

const mockUseApmPluginContext = useApmPluginContext as jest.MockedFunction<
  typeof useApmPluginContext
>;

describe('ErrorSampleContextualInsight', () => {
  beforeEach(() => {
    mockUseApmPluginContext.mockReturnValue({
      observabilityAIAssistant: undefined,
    } as any);
  });

  it('renders null when error is undefined (OTel / incomplete data)', () => {
    const { container } = render(
      <ErrorSampleContextualInsight transaction={{ transaction: { name: 'GET /api' } }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null when error has no service (missing service.environment case)', () => {
    const { container } = render(
      <ErrorSampleContextualInsight
        error={
          {
            error: { exception: [{ message: 'err' }] },
            service: undefined,
          } as any
        }
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not throw when error.service is missing', () => {
    expect(() => {
      render(
        <ErrorSampleContextualInsight
          error={
            {
              error: { exception: [{ message: 'err' }] },
            } as any
          }
        />
      );
    }).not.toThrow();
  });
});
