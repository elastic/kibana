/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { useEffect } from 'react';
import { useObservable, withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import { useKibana } from '../../../common/lib/kibana';
import {
  DataPublicPluginStart,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../src/plugins/data/public';
import {
  CtiQueries,
  CtiThreatIntelSourceStrategyResponse,
  CtiThreatIntelSourceRequestOptions,
} from '../../../../common';
import { DEFAULT_THREAT_INDEX_KEY } from '../../../../common/constants';

type GetThreatIntelSourcProps = CtiThreatIntelSourceRequestOptions & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
};

export const getThreatIntelSource = ({
  data,
  defaultIndex,
  timerange,
  signal,
}: GetThreatIntelSourcProps): Observable<CtiThreatIntelSourceStrategyResponse> =>
  data.search.search<CtiThreatIntelSourceRequestOptions, CtiThreatIntelSourceStrategyResponse>(
    {
      defaultIndex,
      factoryQueryType: CtiQueries.threatIntelSource,
      timerange,
    },
    {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    }
  );

export const getThreatIntelSourceComplete = (
  props: GetThreatIntelSourcProps
): Observable<CtiThreatIntelSourceStrategyResponse> => {
  return getThreatIntelSource(props).pipe(
    filter((response) => {
      return isErrorResponse(response) || isCompleteResponse(response);
    })
  );
};

const getThreatIntelSourceWithOptionalSignal = withOptionalSignal(getThreatIntelSourceComplete);

export const useThreatIntelSourceComplete = () =>
  useObservable(getThreatIntelSourceWithOptionalSignal);

export const useThreatIntelSource = (
  timerange?: { to: string; from: string },
  allIntegrations: any[] = []
) => {
  const { data, uiSettings } = useKibana().services;
  const defaultThreatIndices = uiSettings.get<string[]>(DEFAULT_THREAT_INDEX_KEY);
  const { to, from } = timerange;
  const {
    error,
    result,
    start,
    loading: isThreatInelSourceLoading,
  } = useThreatIntelSourceComplete();

  useEffect(() => {
    start({
      data,
      timerange: to || from ? { to, from, interval: '' } : undefined,
      defaultIndex: defaultThreatIndices,
    });
  }, [to, from, start, data, defaultThreatIndices]);

  const datasets = result?.rawResponse?.aggregations?.dataset?.buckets ?? [];

  const getChildAggregationValue = (aggregation) => aggregation?.buckets?.[0]?.key;

  const integrationMap = datasets.reduce((acc, dataset) => {
    const datasetName = getChildAggregationValue(dataset.name);
    if (datasetName) {
      return {
        ...acc,
        [dataset.key]: {
          dataset: dataset?.key,
          name: datasetName,
          dashboardId: getChildAggregationValue(dataset?.dashboard),
          count: dataset?.doc_count,
        },
      };
    } else {
      const otherDatasetCount = acc.others?.count ?? 0;
      return {
        ...acc,
        others: {
          name: 'Others',
          count: otherDatasetCount + (dataset?.doc_count ?? 0),
        },
      };
    }
  }, {});

  allIntegrations.forEach((integration) => {
    if (!integrationMap[integration.dataset]) {
      integrationMap[integration.dataset] = {
        ...integration,
        count: 0,
      };
    }
  });

  const integrations = Object.values(integrationMap);

  const totalCount = integrations.reduce((acc, val) => acc + val.count, 0);

  console.log('totalCount', totalCount);
  return { integrations, totalCount };
};
