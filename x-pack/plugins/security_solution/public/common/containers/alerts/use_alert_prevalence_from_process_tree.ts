/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useQuery } from 'react-query';
import { useHttp } from '../../lib/kibana';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { TimelineId } from '../../../../common/types/timeline';
import {
  // isLoadingSelector,
  startSelector,
  endSelector,
} from '../../components/super_date_picker/selectors';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useSourcererDataView } from '../sourcerer';
import { sourcererSelectors } from '../../store';

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

function useAlertDocumentAnalyzerSchema(processEntityId: string) {
  const http = useHttp();
  const query = useQuery<EntityResponse[]>(['getAlertPrevalenceSchema', processEntityId], () => {
    return http.get<EntityResponse[]>(`/api/endpoint/resolver/entity`, {
      query: {
        _id: processEntityId,
        indices: ['.alerts-security.alerts-default', 'logs-*'],
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
  const getStartSelector = useMemo(() => startSelector(), []);
  const getEndSelector = useMemo(() => endSelector(), []);
  // const getIsLoadingSelector = useMemo(() => isLoadingSelector(), []);
  const isActive = useMemo(() => timelineId === TimelineId.active, [timelineId]);
  const isInTimeline = timelineId === TimelineId.active;

  // TODO: probably use
  // const shouldUpdate = useDeepEqualSelector((state) => {
  //   if (isActive) {
  //     return getIsLoadingSelector(state.inputs.timeline);
  //   } else {
  //     return getIsLoadingSelector(state.inputs.global);
  //   }
  // });
  const from = useDeepEqualSelector((state) => {
    if (isActive) {
      return getStartSelector(state.inputs.timeline);
    } else {
      return getStartSelector(state.inputs.global);
    }
  });
  const to = useDeepEqualSelector((state) => {
    if (isActive) {
      return getEndSelector(state.inputs.timeline);
    } else {
      return getEndSelector(state.inputs.global);
    }
  });
  const getDefaultDataViewSelector = useMemo(
    () => sourcererSelectors.defaultDataViewSelector(),
    []
  );
  const defaultDataView = useDeepEqualSelector(getDefaultDataViewSelector);

  const { selectedPatterns: timelinePatterns } = useSourcererDataView(SourcererScopeName.timeline);

  const selectedPatterns = useMemo(
    () => (isInTimeline ? timelinePatterns : defaultDataView.patternList),
    [defaultDataView.patternList, isInTimeline, timelinePatterns]
  );

  const { loading, id, schema } = useAlertDocumentAnalyzerSchema(processEntityId);
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
