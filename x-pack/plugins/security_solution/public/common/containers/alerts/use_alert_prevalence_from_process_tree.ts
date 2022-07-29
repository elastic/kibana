/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from 'react-query';
import { useHttp } from '../../lib/kibana';
import { useTimelineDataFilters } from '../../../timelines/containers/use_timeline_data_filters';

export const DETECTIONS_ALERTS_COUNT_ID = 'detections-alerts-count';

interface UserAlertPrevalenceFromProcessTreeResult {
  loading: boolean;
  alertIds: undefined | string[];
  count?: number;
  error: boolean;
}

interface ProcessTreeAlertPrevalenceResponse {
  alertIds: string[];
}

interface EntityResponse {
  id: string;
  name: string;
  schema: object;
}

interface TreeResponse {
  statsNodes: Array<{
    data: object;
    id: string;
    parent: string;
    stats: {
      total: number;
      byCategory: {
        alerts?: number;
      };
    };
  }>;
  alertIds: string[];
}

function useAlertDocumentAnalyzerSchema(processEntityId: string, indices: string[]) {
  const http = useHttp();
  const query = useQuery<EntityResponse[]>(['getAlertPrevalenceSchema', processEntityId], () => {
    return http.get<EntityResponse[]>(`/api/endpoint/resolver/entity`, {
      query: {
        _id: processEntityId,
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
    };
  } else if (query.data) {
    const {
      data: [{ schema, id }],
    } = query;
    return {
      loading: false,
      error: false,
      id,
      schema,
    };
  } else {
    return {
      loading: false,
      error: true,
      id: null,
      schema: null,
    };
  }
}

export function useAlertPrevalenceFromProcessTree(
  processEntityId: string,
  timelineId: string | undefined
): UserAlertPrevalenceFromProcessTreeResult {
  const http = useHttp();

  const { selectedPatterns, to, from } = useTimelineDataFilters(timelineId);

  const { loading, id, schema } = useAlertDocumentAnalyzerSchema(processEntityId, selectedPatterns);
  const query = useQuery<ProcessTreeAlertPrevalenceResponse>(
    ['getAlertPrevalenceFromProcessTree', id],
    () => {
      return http.post<TreeResponse>(`/api/endpoint/resolver/tree`, {
        body: JSON.stringify({
          schema,
          ancestors: 200,
          descendants: 500,
          indexPatterns: selectedPatterns,
          nodes: [id],
          timeRange: { from, to },
          includeHits: true,
        }),
      });
    },
    { enabled: schema !== null && id !== null }
  );
  if (query.isLoading || loading) {
    return {
      loading: true,
      error: false,
      alertIds: undefined,
    };
  } else if (query.data) {
    return {
      loading: false,
      error: false,
      alertIds: query.data.alertIds,
    };
  } else {
    return {
      loading: false,
      error: true,
      alertIds: undefined,
    };
  }
}
