/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../../../common/lib/kibana';

interface EntityResponse {
  id: string;
  name: string;
  schema: object;
  agentId: string;
}

export interface UseAlertDocumentAnalyzerSchemaParams {
  /**
   *
   */
  documentId: string;
  /**
   *
   */
  indices: string[];
}

export interface UseAlertDocumentAnalyzerSchemaResult {
  /**
   *
   */
  loading: boolean;
  /**
   *
   */
  error: boolean;
  /**
   *
   */
  id: string | null;
  /**
   *
   */
  schema: object | null;
  /**
   *
   */
  agentId: string | null;
}

export function useAlertDocumentAnalyzerSchema({
  documentId,
  indices,
}: UseAlertDocumentAnalyzerSchemaParams): UseAlertDocumentAnalyzerSchemaResult {
  const http = useHttp();

  const query = useQuery<EntityResponse[]>(['getAlertPrevalenceSchema', documentId], () => {
    return http.get<EntityResponse[]>(`/api/endpoint/resolver/entity`, {
      query: {
        _id: documentId,
        indices,
      },
    });
  });

  if (query.isLoading) {
    return {
      loading: true,
      error: false,
      id: null,
      schema: null,
      agentId: null,
    };
  } else if (query.data && query.data.length > 0) {
    const {
      data: [{ schema, id, agentId }],
    } = query;
    return {
      loading: false,
      error: false,
      id,
      schema,
      agentId,
    };
  } else {
    return {
      loading: false,
      error: true,
      id: null,
      schema: null,
      agentId: null,
    };
  }
}
