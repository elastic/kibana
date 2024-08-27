/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import { useQuery } from '@tanstack/react-query';
import type {
  UseAlertDocumentAnalyzerSchemaParams,
  UseAlertDocumentAnalyzerSchemaResult,
} from './use_alert_document_analyzer_schema';
import { useAlertDocumentAnalyzerSchema } from './use_alert_document_analyzer_schema';
import { useHttp } from '../../../../common/lib/kibana';

jest.mock('../../../../common/lib/kibana');
jest.mock('@tanstack/react-query');

describe('useAlertPrevalenceFromProcessTree', () => {
  let hookResult: RenderHookResult<
    UseAlertDocumentAnalyzerSchemaParams,
    UseAlertDocumentAnalyzerSchemaResult
  >;

  beforeEach(() => {
    (useHttp as jest.Mock).mockReturnValue({
      get: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return all properties when loading', () => {
    (useQuery as jest.Mock).mockReturnValue({
      isLoading: true,
      data: [],
    });

    hookResult = renderHook(() =>
      useAlertDocumentAnalyzerSchema({
        documentId: 'documentId',
        indices: [],
      })
    );

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.id).toEqual(null);
    expect(hookResult.result.current.schema).toEqual(null);
    expect(hookResult.result.current.agentId).toEqual(null);
  });

  it('should return all properties with data', () => {
    (useQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [
        {
          schema: {},
          id: 'id',
          agentId: 'agentId',
        },
      ],
    });

    hookResult = renderHook(() =>
      useAlertDocumentAnalyzerSchema({
        documentId: 'documentId',
        indices: [],
      })
    );

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.id).toEqual('id');
    expect(hookResult.result.current.schema).toEqual({});
    expect(hookResult.result.current.agentId).toEqual('agentId');
  });

  it('should return error when no data', () => {
    (useQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [],
    });

    hookResult = renderHook(() =>
      useAlertDocumentAnalyzerSchema({
        documentId: 'documentId',
        indices: [],
      })
    );

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.error).toEqual(true);
    expect(hookResult.result.current.id).toEqual(null);
    expect(hookResult.result.current.schema).toEqual(null);
    expect(hookResult.result.current.agentId).toEqual(null);
  });
});
