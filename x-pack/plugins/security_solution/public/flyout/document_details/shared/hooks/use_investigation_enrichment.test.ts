/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useInvestigationTimeEnrichment } from './use_investigation_enrichment';
import {
  DEFAULT_EVENT_ENRICHMENT_FROM,
  DEFAULT_EVENT_ENRICHMENT_TO,
} from '../../../../../common/cti/constants';
import { useEventEnrichmentComplete } from '../services/threat_intelligence';

jest.mock('../services/threat_intelligence');
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => jest.fn(),
  };
});
jest.mock('../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
  }),
}));
jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        data: {
          search: {
            search: () => ({
              subscribe: () => ({
                unsubscribe: jest.fn(),
              }),
            }),
          },
        },
        uiSettings: {
          get: jest.fn().mockReturnValue(''),
        },
      },
    }),
  };
});

describe('useInvestigationTimeEnrichment', () => {
  it('should return default range', () => {
    (useEventEnrichmentComplete as jest.Mock).mockReturnValue({});

    const { result } = renderHook(() =>
      useInvestigationTimeEnrichment({
        eventFields: {},
      })
    );

    expect(result.current.range).toEqual({
      from: DEFAULT_EVENT_ENRICHMENT_FROM,
      to: DEFAULT_EVENT_ENRICHMENT_TO,
    });
    expect(typeof result.current.setRange).toBe('function');
  });

  it('should return loading', () => {
    (useEventEnrichmentComplete as jest.Mock).mockReturnValue({
      error: null,
      result: undefined,
      loading: true,
    });

    const { result } = renderHook(() =>
      useInvestigationTimeEnrichment({
        eventFields: {},
      })
    );

    expect(result.current.loading).toEqual(true);
  });

  it('should return no enrichments', () => {
    (useEventEnrichmentComplete as jest.Mock).mockReturnValue({});

    const { result } = renderHook(() =>
      useInvestigationTimeEnrichment({
        eventFields: {},
      })
    );

    expect(result.current.result).toEqual({ enrichments: [] });
  });

  it('should return enrichments and loading false', () => {
    (useEventEnrichmentComplete as jest.Mock).mockReturnValue({
      error: null,
      result: {
        enrichments: [{}],
        inspect: { dsl: [] },
        totalCount: 0,
      },
      loading: false,
      start: jest.fn(),
    });

    const { result } = renderHook(() =>
      useInvestigationTimeEnrichment({
        eventFields: { test: 'test' },
      })
    );

    expect(result.current.result).toEqual({
      enrichments: [{}],
      inspect: { dsl: [] },
      totalCount: 0,
    });
    expect(result.current.loading).toEqual(false);
  });
});
