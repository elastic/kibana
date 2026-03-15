/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePerformanceContext } from '@kbn/ebt-tools';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel, useEuiTheme } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import useWindowSize from 'react-use/lib/useWindowSize';
import { cx } from '@emotion/css';
import type { ServiceMapCache } from './use_service_map';
import type { ReactFlowServiceMapResponse } from '../../../../common/service_map';
import {
  useServiceMapFullScreen,
  applyServiceMapFullScreenBodyClasses,
} from './use_service_map_fullscreen';
import { SERVICE_MAP_WRAPPER_FULL_SCREEN_CLASS, SERVICE_MAP_FULL_SCREEN_CLASS } from './constants';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import { invalidLicenseMessage, SERVICE_MAP_TIMEOUT_ERROR } from '../../../../common/service_map';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { LicensePrompt } from '../../shared/license_prompt';
import { EmptyPrompt } from './empty_prompt';
import { TimeoutPrompt } from './timeout_prompt';
import { useRefDimensions } from './use_ref_dimensions';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { useServiceName } from '../../../hooks/use_service_name';
import { useApmParams, useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import type { Environment } from '../../../../common/environment_rt';
import { useTimeRange } from '../../../hooks/use_time_range';
import { DisabledPrompt } from './disabled_prompt';
import { useServiceMap } from './use_service_map';
import { ServiceMapGraph } from './graph';
import {
  addServiceToKuery,
  removeServiceFromKuery,
  getExpandedServiceNamesFromKuery,
  getBaseKuery,
} from './kuery_expand_helpers';
import { filterToVisibleSubgraph } from './filter_to_visible_subgraph';
import { ServiceMapExpandProvider } from './service_map_expand_context';
import { toQuery, fromQuery } from '../../shared/links/url_helpers';

function PromptContainer({ children }: { children: ReactNode }) {
  return (
    <>
      <SearchBar showTimeComparison />
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceAround"
        // Set the height to give it some top margin
        style={{ height: '60vh' }}
      >
        <EuiFlexItem grow={false} style={{ width: 600, textAlign: 'center' as const }}>
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

function LoadingSpinner() {
  return <EuiLoadingSpinner size="xl" style={{ position: 'absolute', top: '50%', left: '50%' }} />;
}

export function ServiceMapHome() {
  const {
    query: { environment, kuery, rangeFrom, rangeTo, serviceGroup },
  } = useApmParams('/service-map');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  return (
    <ServiceMap
      environment={environment}
      kuery={kuery}
      start={start}
      end={end}
      serviceGroupId={serviceGroup}
    />
  );
}

export function ServiceMapServiceDetail() {
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useAnyOfApmParams(
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  return <ServiceMap environment={environment} kuery={kuery} start={start} end={end} />;
}

export function ServiceMap({
  environment,
  kuery,
  start,
  end,
  serviceGroupId,
}: {
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  serviceGroupId?: string;
}) {
  const license = useLicenseContext();
  const serviceName = useServiceName();
  const apmRouter = useApmRouter();
  const { query } = useAnyOfApmParams(
    '/service-map',
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );

  const fullMapHref =
    serviceName && 'rangeFrom' in query && 'rangeTo' in query && query.rangeFrom && query.rangeTo
      ? apmRouter.link('/service-map', {
          query: {
            rangeFrom: query.rangeFrom,
            rangeTo: query.rangeTo,
            environment: query.environment,
            kuery: query.kuery,
            comparisonEnabled: query.comparisonEnabled,
            offset: query.offset,
            serviceGroup: 'serviceGroup' in query ? query.serviceGroup ?? '' : '',
          },
        })
      : undefined;

  const { config } = useApmPluginContext();
  const { onPageReady } = usePerformanceContext();

  const enableExpandCollapse = serviceName === undefined;
  const serviceMapCacheRef = useRef<Map<string, ReactFlowServiceMapResponse>>(new Map());
  const cacheRef: ServiceMapCache | undefined = enableExpandCollapse
    ? serviceMapCacheRef
    : undefined;

  // Smart cache: when expand/collapse is enabled, fetch once with base filters only
  // (no service names). Cache key is per base kuery, so +/- only filters the cached graph.
  const fetchKuery = enableExpandCollapse ? getBaseKuery(kuery) : kuery;

  const { data, status, error } = useServiceMap({
    environment,
    kuery: fetchKuery,
    start,
    end,
    serviceGroupId,
    serviceName,
    cacheRef,
  });

  const expandedServiceIds = useMemo(
    () => new Set(getExpandedServiceNamesFromKuery(kuery)),
    [kuery]
  );

  const { nodes: displayNodes, edges: displayEdges } = useMemo(() => {
    if (!enableExpandCollapse || data.nodes.length === 0) {
      return { nodes: data.nodes, edges: data.edges };
    }
    return filterToVisibleSubgraph(data.nodes, data.edges, expandedServiceIds);
  }, [enableExpandCollapse, data.nodes, data.edges, expandedServiceIds]);

  const { ref, height } = useRefDimensions();
  const windowHeight = useWindowSize().height;
  const { euiTheme } = useEuiTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { styles, bodyClassesToToggle } = useServiceMapFullScreen();
  const fullScreenContainerStyles = styles[SERVICE_MAP_FULL_SCREEN_CLASS];

  // Temporary hack to work around bottom padding introduced by EuiPage
  const PADDING_BOTTOM = 24;
  const heightWithPadding = height - PADDING_BOTTOM;

  /** Store height when entering fullscreen; use it when exiting so zoom/actions don't corrupt measurement */
  const heightBeforeFullscreenRef = useRef(heightWithPadding);
  const [useStoredHeight, setUseStoredHeight] = useState(false);

  if (!isFullscreen && !useStoredHeight) {
    heightBeforeFullscreenRef.current = heightWithPadding;
  }

  const mapHeight = isFullscreen
    ? windowHeight - PADDING_BOTTOM
    : useStoredHeight
    ? heightBeforeFullscreenRef.current
    : heightWithPadding;

  const onToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      if (prev) {
        setUseStoredHeight(true);
      }
      return !prev;
    });
  }, []);

  const history = useHistory();
  const location = useLocation();

  const expandCollapseValue = useMemo(() => {
    if (!enableExpandCollapse) {
      return null;
    }
    const nodeIdsInEdges = new Set(data.edges.flatMap((e) => [e.source, e.target]));
    const serviceIdsWithConnections = new Set(
      data.nodes
        .filter((n) => n.type === 'service')
        .filter((n) => nodeIdsInEdges.has(n.id))
        .map((n) => n.id)
    );
    return {
      expandedServiceIds,
      serviceIdsWithConnections,
      onExpandService: (serviceId: string) => {
        const newKuery = addServiceToKuery(kuery, serviceId);
        const existingQuery = toQuery(location.search);
        history.push({
          ...location,
          search: fromQuery({ ...existingQuery, kuery: newKuery }),
        });
      },
      onCollapseService: (serviceId: string) => {
        const newKuery = removeServiceFromKuery(kuery, serviceId);
        const existingQuery = toQuery(location.search);
        history.push({
          ...location,
          search: fromQuery({ ...existingQuery, kuery: newKuery }),
        });
      },
    };
  }, [
    enableExpandCollapse,
    kuery,
    location,
    history,
    data.nodes,
    data.edges,
    expandedServiceIds,
  ]);

  useLayoutEffect(() => {
    if (isFullscreen) {
      applyServiceMapFullScreenBodyClasses(true, bodyClassesToToggle);
      return () => {
        applyServiceMapFullScreenBodyClasses(false, bodyClassesToToggle);
        setUseStoredHeight(false);
      };
    }
  }, [isFullscreen, bodyClassesToToggle]);

  if (!license) {
    return null;
  }

  if (!isActivePlatinumLicense(license)) {
    return (
      <PromptContainer>
        <LicensePrompt text={invalidLicenseMessage} />
      </PromptContainer>
    );
  }

  if (!config.serviceMapEnabled) {
    return (
      <PromptContainer>
        <DisabledPrompt />
      </PromptContainer>
    );
  }

  const isEmpty = displayNodes.length === 0;

  if (status === FETCH_STATUS.SUCCESS && isEmpty) {
    return (
      <PromptContainer>
        <EmptyPrompt />
      </PromptContainer>
    );
  }

  if (
    status === FETCH_STATUS.FAILURE &&
    error &&
    'body' in error &&
    error.body?.statusCode === 500 &&
    error.body?.message === SERVICE_MAP_TIMEOUT_ERROR
  ) {
    return (
      <PromptContainer>
        <TimeoutPrompt isGlobalServiceMap={!serviceName} />
      </PromptContainer>
    );
  }

  if (status === FETCH_STATUS.SUCCESS) {
    onPageReady({
      customMetrics: {
        key1: 'num_of_nodes',
        value1: data.nodesCount,
        key2: 'num_of_traces',
        value2: data.tracesCount,
      },
      meta: { rangeFrom: start, rangeTo: end },
    });
  }

  return (
    <>
      <SearchBar showTimeComparison />
      <div
        className={cx({
          [SERVICE_MAP_WRAPPER_FULL_SCREEN_CLASS]: isFullscreen,
          [SERVICE_MAP_FULL_SCREEN_CLASS]: isFullscreen,
        })}
        css={isFullscreen ? fullScreenContainerStyles : undefined}
      >
        <EuiPanel hasBorder={true} paddingSize="none">
          <div
            data-test-subj="serviceMap"
            style={{
              height: isFullscreen ? '100%' : mapHeight,
              zIndex: Number(euiTheme.levels.content) + 1,
              ...(isFullscreen ? { minHeight: 0, flex: 1 } : {}),
            }}
            ref={ref}
          >
            {status === FETCH_STATUS.LOADING && <LoadingSpinner />}
            <ServiceMapExpandProvider value={expandCollapseValue}>
              <ServiceMapGraph
                height={mapHeight}
                nodes={displayNodes}
                edges={displayEdges}
                serviceName={serviceName}
                environment={environment}
                kuery={kuery}
                start={start}
                end={end}
                isFullscreen={isFullscreen}
                onToggleFullscreen={onToggleFullscreen}
                fullMapHref={fullMapHref}
              />
            </ServiceMapExpandProvider>
          </div>
        </EuiPanel>
      </div>
    </>
  );
}
