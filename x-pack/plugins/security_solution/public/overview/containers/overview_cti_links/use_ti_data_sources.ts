/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { useEffect, useState } from 'react';
import { useObservable, withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import { useKibana } from '../../../common/lib/kibana';
import {
  DataPublicPluginStart,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../src/plugins/data/public';
import {
  Bucket,
  CtiQueries,
  CtiDataSourceStrategyResponse,
  CtiDataSourceRequestOptions,
} from '../../../../common';
import { DEFAULT_THREAT_INDEX_KEY } from '../../../../common/constants';
import { createIndicesFromPrefix } from '../../../transforms/utils';

type GetThreatIntelSourcProps = CtiDataSourceRequestOptions & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
};

export const getTiDataSources = ({
  data,
  defaultIndex,
  timerange,
  signal,
}: GetThreatIntelSourcProps): Observable<CtiDataSourceStrategyResponse> =>
  data.search.search<CtiDataSourceRequestOptions, CtiDataSourceStrategyResponse>(
    {
      defaultIndex,
      factoryQueryType: CtiQueries.dataSource,
      timerange,
    },
    {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    }
  );

export const getTiDataSourcesComplete = (
  props: GetThreatIntelSourcProps
): Observable<CtiDataSourceStrategyResponse> => {
  return getTiDataSources(props).pipe(
    filter((response) => {
      return isErrorResponse(response) || isCompleteResponse(response);
    })
  );
};

const getTiDataSourcesWithOptionalSignal = withOptionalSignal(getTiDataSourcesComplete);

export const useTiDataSourcesComplete = () => useObservable(getTiDataSourcesWithOptionalSignal);

export interface TiDataSources {
  dataset: string;
  name: string;
  count: number;
  dashboardId?: string;
}

export const useTiDataSources = (
  timerange: { to?: string; from?: string } = {},
  allTiDataSources?: TiDataSources[]
) => {
  const [tiDataSources, setTiDataSources] = useState<TiDataSources[]>([]);
  const { data, uiSettings } = useKibana().services;
  const { to, from } = timerange;
  const defaultThreatIndices = uiSettings.get<string[]>(DEFAULT_THREAT_INDEX_KEY);
  const { result, start, loading } = useTiDataSourcesComplete();

  useEffect(() => {
    start({
      data,
      timerange: to && from ? { to, from, interval: '' } : undefined,
      defaultIndex: defaultThreatIndices,
    });
  }, [to, from, start, data, defaultThreatIndices]);

  useEffect(() => {
    if (!loading && result) {
      const datasets = result?.rawResponse?.aggregations?.dataset?.buckets ?? [];

      const getChildAggregationValue = (aggregation?: Bucket) => aggregation?.buckets?.[0]?.key;

      const integrationMap = datasets.reduce((acc: Record<string, TiDataSources>, dataset) => {
        const datasetName = getChildAggregationValue(dataset?.name);
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
          const otherTiDatasetKey = '_others_ti_';
          const otherDatasetCount = acc[otherTiDatasetKey]?.count ?? 0;
          return {
            ...acc,
            [otherTiDatasetKey]: {
              dataset: otherTiDatasetKey,
              name: 'Others',
              count: otherDatasetCount + (dataset?.doc_count ?? 0),
            },
          };
        }
      }, {});

      if (Array.isArray(allTiDataSources)) {
        allTiDataSources.forEach((integration) => {
          if (!integrationMap[integration.dataset]) {
            integrationMap[integration.dataset] = {
              ...integration,
              count: 0,
            };
          }
        });
      }

      setTiDataSources(Object.values(integrationMap));
    }
  }, [result, loading, allTiDataSources]);

  const totalCount = tiDataSources.reduce((acc, val) => acc + val.count, 0);

  return { tiDataSources, totalCount };
};
