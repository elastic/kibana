/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useReducer } from 'react';
import createContainer from 'constate';
import { BoolQuery } from '@kbn/es-query';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useSourceContext } from '../../../../containers/metrics_source';
import { useUnifiedSearchContext } from './use_unified_search';
import {
  GetInfraMetricsRequestBodyPayload,
  GetInfraMetricsResponsePayload,
  InfraAssetMetricType,
} from '../../../../../common/http_api';
import { StringDateRange } from './use_unified_search_url_state';

const HOST_TABLE_METRICS: Array<{ type: InfraAssetMetricType }> = [
  { type: 'rx' },
  { type: 'tx' },
  { type: 'memory' },
  { type: 'cpu' },
  { type: 'diskLatency' },
  { type: 'memoryTotal' },
];

const BASE_INFRA_METRICS_PATH = '/api/metrics/infra';

interface Asset {
  'asset.id': string;
  'asset.name': string;
}

interface GetAssetsResponse {
  results: Asset[];
}

interface GetRelatedAssetsResponse {
  results: {
    references?: Asset[];
    descendants?: Asset[];
  };
}

interface HostNode {
  name: string;
  metrics: any[];
  metadata: any[];
  assetInformation: {
    containerInformation: {
      count: number;
      items: string[];
    };
    serviceInformation: {
      count: number;
      items: string[];
    };
    alertInformation: {
      count: number;
      items: string[];
    };
  };
}

export const useHostsView = () => {
  const { sourceId } = useSourceContext();
  const {
    services: { http },
  } = useKibanaContextForPlugin();
  const { buildQuery, getParsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const abortCtrlRef = useRef(new AbortController());

  const [state, dispatch] = useReducer(hostNodeReducer, {
    hostNodes: [],
    shouldEnrichWithMetrics: false,
    shouldEnrichWithAssetInformation: false,
  });

  const [assets, fetchHostAssets] = useAsyncFn(
    () => {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      const { from, to } = getParsedDateRange();

      return http.get<GetAssetsResponse>('/api/asset-manager/assets', {
        signal: abortCtrlRef.current.signal,
        query: {
          from,
          to,
          kind: 'host',
          size: searchCriteria.limit,
        },
      });
    },
    [http, getParsedDateRange, searchCriteria.limit],
    { loading: true, value: { results: [] } }
  );

  useEffect(() => {
    fetchHostAssets();
  }, [fetchHostAssets]);

  const { value, error, loading } = assets;

  useEffect(() => {
    if (value?.results) {
      dispatch({
        type: 'assets_loaded',
        payload: value.results,
      });
    }
  }, [value]);

  // What if the time range changes while we're loading metrics?
  // We'll update the hosts array and mark that enrichment is needed but it's already in progress
  // So this effect won't trigger, unless we can "cancel" this round and start again for the new hosts
  useEffect(() => {
    if (!state.shouldEnrichWithMetrics) {
      return;
    }

    const promises = [];

    for (const host of state.hostNodes) {
      const query = buildQuery();
      const request = createInfraMetricsRequest({
        dateRange: getParsedDateRange(),
        esQuery: {
          bool: {
            ...query.bool,
            must: [
              ...query.bool.must,
              {
                term: {
                  'host.name': {
                    value: host.name,
                  },
                },
              },
            ],
          },
        },
        sourceId,
        limit: 1,
      });

      const promise = http.post<GetInfraMetricsResponsePayload>(`${BASE_INFRA_METRICS_PATH}`, {
        body: JSON.stringify(request),
      });

      promise
        .then((response) => {
          const { nodes } = response;
          const node = nodes[0];
          dispatch({
            type: 'metrics_loaded',
            payload: {
              name: host.name,
              metrics: node.metrics,
              metadata: node.metadata,
            },
          });
        })
        .catch(console.log); // eslint-disable-line no-console

      promises.push(promise);
    }

    Promise.allSettled(promises).then(() => {
      dispatch({
        type: 'metric_enrichment_done',
      });
    });
  }, [state.shouldEnrichWithMetrics]); // eslint-disable-line react-hooks/exhaustive-deps

  // Firing all of these various requests from the frontend will likely leave us into being throttled by the max connection of the browser
  // We could maybe combine some of these requests but there are benefits to having things split as well.
  useEffect(() => {
    if (!state.shouldEnrichWithAssetInformation) {
      return;
    }

    const { from, to } = getParsedDateRange();

    const promises = [];

    for (const host of state.hostNodes) {
      // The data model is a bit mixed about what is a reference and what is a ancestor/descendant
      const fetchHostedContainers = http.get<GetRelatedAssetsResponse>(
        '/api/asset-manager/assets/related',
        {
          query: {
            from,
            to,
            kind: 'container',
            size: 100,
            ean: `host:${host.name}`,
            relation: 'references',
          },
        }
      );
      const fetchHostedServices = http.get<GetRelatedAssetsResponse>(
        '/api/asset-manager/assets/related',
        {
          query: {
            from,
            to,
            kind: 'service',
            size: 100,
            ean: `host:${host.name}`,
            relation: 'descendants',
          },
        }
      );
      const fetchAlerts = http.get<GetRelatedAssetsResponse>('/api/asset-manager/assets/related', {
        query: {
          from,
          to,
          kind: 'alert',
          size: 100,
          ean: `host:${host.name}`,
          relation: 'references',
        },
      });

      function unpackAssetInformation(result: PromiseSettledResult<GetRelatedAssetsResponse>) {
        if (result.status === 'rejected') {
          return {
            count: -1,
            items: [],
          };
        }

        const {
          results: { references, descendants }, // Maybe the API should only return one key for all relation types
        } = result.value;

        const relatedAssets = [
          ...(references ? references : []),
          ...(descendants ? descendants : []),
        ];

        return {
          count: relatedAssets.length,
          items: relatedAssets.map((asset) => asset['asset.name'] ?? asset['asset.id']),
        };
      }

      const promise = Promise.allSettled([fetchHostedContainers, fetchHostedServices, fetchAlerts]) // How to capture errors here?
        .then(([containersResult, servicesResult, alertsResult]) => {
          dispatch({
            type: 'asset_information_loaded',
            payload: {
              name: host.name,
              containerInformation: unpackAssetInformation(containersResult),
              serviceInformation: unpackAssetInformation(servicesResult),
              alertInformation: unpackAssetInformation(alertsResult),
            },
          });
        })
        .catch(console.log); // eslint-disable-line no-console

      promises.push(promise);
    }

    Promise.allSettled(promises).then(() => {
      dispatch({
        type: 'asset_enrichment_done',
      });
    });
  }, [state.shouldEnrichWithAssetInformation]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    requestTs: Date.now(),
    loading,
    error,
    hostNodes: state.hostNodes,
  };
};

export const HostsView = createContainer(useHostsView);
export const [HostsViewProvider, useHostsViewContext] = HostsView;

/**
 * Helpers
 */

const createInfraMetricsRequest = ({
  esQuery,
  sourceId,
  dateRange,
  limit,
}: {
  esQuery: { bool: BoolQuery };
  sourceId: string;
  dateRange: StringDateRange;
  limit: number;
}): GetInfraMetricsRequestBodyPayload & { requestTs: number } => ({
  type: 'host',
  query: esQuery,
  range: {
    from: dateRange.from,
    to: dateRange.to,
  },
  metrics: HOST_TABLE_METRICS,
  limit,
  sourceId,
  requestTs: Date.now(),
});

function toHostTableRow(asset: Asset): HostNode {
  return {
    // Grab first or join? Will it ever be more than one?
    name: Array.isArray(asset['asset.id']) ? asset['asset.id'][0] : asset['asset.id'],
    metrics: [],
    metadata: [],
    assetInformation: {
      containerInformation: {
        count: -1,
        items: [],
      },
      serviceInformation: {
        count: -1,
        items: [],
      },
      alertInformation: {
        count: -1,
        items: [],
      },
    },
  };
}

interface AssetsLoaded {
  type: 'assets_loaded';
  payload: Asset[];
}

interface MetricsLoaded {
  type: 'metrics_loaded';
  payload: {
    name: string;
    metrics: any[];
    metadata: any[];
  };
}

interface AssetInformationLoaded {
  type: 'asset_information_loaded';
  payload: {
    name: string;
    containerInformation: {
      count: number;
      items: string[];
    };
    serviceInformation: {
      count: number;
      items: string[];
    };
    alertInformation: {
      count: number;
      items: string[];
    };
  };
}

interface MetricEnrichmentDone {
  type: 'metric_enrichment_done';
}

interface AssetEnrichmentDone {
  type: 'asset_enrichment_done';
}

type Actions =
  | AssetsLoaded
  | MetricsLoaded
  | AssetInformationLoaded
  | MetricEnrichmentDone
  | AssetEnrichmentDone;

interface State {
  hostNodes: HostNode[];
  shouldEnrichWithMetrics: boolean;
  shouldEnrichWithAssetInformation: boolean;
}

function hostNodeReducer(state: State, action: Actions): State {
  switch (action.type) {
    case 'assets_loaded': {
      const shouldEnrich = action.payload.length > 0;
      return {
        hostNodes: action.payload.map(toHostTableRow),
        shouldEnrichWithMetrics: shouldEnrich,
        shouldEnrichWithAssetInformation: shouldEnrich,
      };
    }
    // The fact that the list of hostNodes changes with each completed enrichment could be an issue
    // since it triggers multiple down stream re-renders
    case 'metrics_loaded': {
      const { hostNodes } = state;
      const { name, metrics, metadata } = action.payload;
      const host = hostNodes.find((hostNode) => hostNode.name === name);

      if (!host) {
        return state;
      }

      const updatedHost: HostNode = {
        ...host,
        metrics,
        metadata,
      };

      const index = hostNodes.findIndex((hostNode) => hostNode.name === name);
      const hostsBefore = hostNodes.slice(0, index);
      const hostsAfter = hostNodes.slice(index + 1);

      return {
        ...state,
        hostNodes: [...hostsBefore, updatedHost, ...hostsAfter],
      };
    }
    case 'asset_information_loaded': {
      const { hostNodes } = state;
      const { name, containerInformation, serviceInformation, alertInformation } = action.payload;
      const host = hostNodes.find((hostNode) => hostNode.name === name);

      if (!host) {
        return state;
      }

      const updatedHost = {
        ...host,
        assetInformation: {
          containerInformation,
          serviceInformation,
          alertInformation,
        },
      };

      const index = hostNodes.findIndex((hostNode) => hostNode.name === name);
      const hostsBefore = hostNodes.slice(0, index);
      const hostsAfter = hostNodes.slice(index + 1);

      return {
        ...state,
        hostNodes: [...hostsBefore, updatedHost, ...hostsAfter],
      };
    }
    case 'metric_enrichment_done': {
      return {
        ...state,
        shouldEnrichWithMetrics: false,
      };
    }
    case 'asset_enrichment_done': {
      return {
        ...state,
        shouldEnrichWithAssetInformation: false,
      };
    }
    default: {
      return state;
    }
  }
}

// Add enhacning for Number of infra units (containers or pods?)
// Number of services
// Number of alerts
