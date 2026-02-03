/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePerformanceContext } from '@kbn/ebt-tools';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel, useEuiTheme } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useEffect, useRef } from 'react';
import { Subscription } from 'rxjs';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import { invalidLicenseMessage, SERVICE_MAP_TIMEOUT_ERROR } from '../../../../common/service_map';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { LicensePrompt } from '../../shared/license_prompt';
import { Controls } from './controls';
import { Cytoscape } from './cytoscape';
import { getCytoscapeDivStyle } from './cytoscape_options';
import { EmptyBanner } from './empty_banner';
import { EmptyPrompt } from './empty_prompt';
import { Popover } from './popover';
import { TimeoutPrompt } from './timeout_prompt';
import { useRefDimensions } from './use_ref_dimensions';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { useServiceName } from '../../../hooks/use_service_name';
import { useApmParams, useAnyOfApmParams } from '../../../hooks/use_apm_params';
import type { Environment } from '../../../../common/environment_rt';
import { useTimeRange } from '../../../hooks/use_time_range';
import { DisabledPrompt } from './disabled_prompt';
import {
  useServiceMap,
  isReactFlowServiceMapState,
  isCytoscapeServiceMapState,
} from './use_service_map';
import { APM_SERVICE_MAP_USE_REACT_FLOW_FEATURE_FLAG_KEY } from '../../../../common/apm_feature_flags';
import { ReactFlowServiceMap } from './react_flow_service_map';

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
  const { euiTheme } = useEuiTheme();
  const license = useLicenseContext();
  const serviceName = useServiceName();

  const {
    config,
    core: { featureFlags },
  } = useApmPluginContext();
  const { onPageReady } = usePerformanceContext();
  const showReactFlowServiceMap = featureFlags.getBooleanValue(
    APM_SERVICE_MAP_USE_REACT_FLOW_FEATURE_FLAG_KEY,
    false
  );

  const subscriptions = useRef<Subscription>(new Subscription());

  useEffect(() => {
    const currentSubscriptions = subscriptions.current;
    return () => {
      currentSubscriptions.unsubscribe();
    };
  }, []);

  const { data, status, error } = useServiceMap({
    environment,
    kuery,
    start,
    end,
    serviceGroupId,
    serviceName,
  });

  const { ref, height } = useRefDimensions();

  // Temporary hack to work around bottom padding introduced by EuiPage
  const PADDING_BOTTOM = 24;
  const heightWithPadding = height - PADDING_BOTTOM;

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

  // Check for empty state - handle both Cytoscape and React Flow formats
  const isEmpty = isReactFlowServiceMapState(data)
    ? data.nodes.length === 0
    : data.elements.length === 0;

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

  if (showReactFlowServiceMap && isReactFlowServiceMapState(data)) {
    return (
      <>
        <SearchBar showTimeComparison />
        <EuiPanel hasBorder={true} paddingSize="none">
          <div data-test-subj="serviceMap" style={{ height: heightWithPadding }} ref={ref}>
            {status === FETCH_STATUS.LOADING && <LoadingSpinner />}
            <ReactFlowServiceMap
              height={heightWithPadding}
              nodes={data.nodes}
              edges={data.edges}
              serviceName={serviceName}
              environment={environment}
              kuery={kuery}
              start={start}
              end={end}
            />
          </div>
        </EuiPanel>
      </>
    );
  }

  // Fallback to Cytoscape format
  if (!isCytoscapeServiceMapState(data)) {
    return null;
  }

  return (
    <>
      <SearchBar showTimeComparison />
      <EuiPanel hasBorder={true} paddingSize="none">
        <div data-test-subj="serviceMap" style={{ height: heightWithPadding }} ref={ref}>
          <Cytoscape
            elements={data.elements}
            height={heightWithPadding}
            serviceName={serviceName}
            style={getCytoscapeDivStyle(euiTheme, status)}
          >
            <Controls />
            {serviceName && <EmptyBanner />}
            {status === FETCH_STATUS.LOADING && <LoadingSpinner />}
            <Popover
              focusedServiceName={serviceName}
              environment={environment}
              kuery={kuery}
              start={start}
              end={end}
            />
          </Cytoscape>
        </div>
      </EuiPanel>
    </>
  );
}
