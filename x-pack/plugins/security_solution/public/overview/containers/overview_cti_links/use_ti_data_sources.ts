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
import {
  DataPublicPluginStart,
  isCompleteResponse,
  isErrorResponse,
} from '@kbn/data-plugin/public';
import { useKibana } from '../../../common/lib/kibana';
import {
  Bucket,
  CtiQueries,
  CtiDataSourceStrategyResponse,
  CtiDataSourceRequestOptions,
} from '../../../../common/search_strategy/security_solution/cti';
import { DEFAULT_THREAT_INDEX_KEY } from '../../../../common/constants';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { OTHER_DATA_SOURCE_TITLE } from '../../components/overview_cti_links/translations';
import { OTHER_TI_DATASET_KEY } from '../../../../common/cti/constants';

type GetThreatIntelSourcProps = CtiDataSourceRequestOptions & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
};
export const ID = 'ctiEventCountQuery';

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
interface TiDataSourcesProps extends Partial<GlobalTimeArgs> {
  allTiDataSources?: TiDataSources[];
}

export const useTiDataSources = ({
  to,
  from,
  allTiDataSources,
  setQuery,
  deleteQuery,
}: TiDataSourcesProps) => {
  const [tiDataSources, setTiDataSources] = useState<TiDataSources[]>([]);
  const [isInitiallyLoaded, setIsInitiallyLoaded] = useState(false);
  const { data, uiSettings } = useKibana().services;
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
    if (!loading && result?.rawResponse && result?.inspect && setQuery) {
      setQuery({
        id: ID,
        inspect: {
          dsl: result?.inspect?.dsl ?? [],
          response: [JSON.stringify(result.rawResponse, null, 2)],
        },
        loading,
        refetch: () => {},
      });
    }
  }, [setQuery, loading, result]);

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, [deleteQuery]);

  useEffect(() => {
    if (result && !isInitiallyLoaded) {
      setIsInitiallyLoaded(true);
    }
  }, [isInitiallyLoaded, result]);

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
          const otherTiDatasetKey = OTHER_TI_DATASET_KEY;
          const otherDatasetCount = acc[otherTiDatasetKey]?.count ?? 0;
          return {
            ...acc,
            [otherTiDatasetKey]: {
              dataset: otherTiDatasetKey,
              name: OTHER_DATA_SOURCE_TITLE,
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

  return { tiDataSources, totalCount, isInitiallyLoaded };
};
