/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePerformanceContext } from '@kbn/ebt-tools';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ReactNode } from 'react';
import React, { useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import useWindowSize from 'react-use/lib/useWindowSize';
import { cx } from '@emotion/css';
import type { BoolQuery } from '@kbn/es-query';
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
import { useServiceName } from '../../../hooks/use_service_name';
import { useApmParams, useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import type { Environment } from '../../../../common/environment_rt';
import { useTimeRange } from '../../../hooks/use_time_range';
import { DisabledPrompt } from './disabled_prompt';
import { SloOverviewFlyout, useSloOverviewFlyout } from '../../shared/slo_overview_flyout';
import { useServiceMap } from './use_service_map';
import { useServiceMapBadges } from './use_service_map_badges';
import { getServiceMapBadgesEnd } from './get_service_map_badges_end';
import { ServiceMapGraph } from './graph';
import { ServiceMapSloFlyoutProvider } from '../../shared/service_map/service_map_slo_flyout_context';
import { useServiceMapSearchContext } from './service_map_search_context';

function PromptContainer({ children }: { children: ReactNode }) {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceAround" style={{ height: '60vh' }}>
      <EuiFlexItem grow={false} style={{ width: 600, textAlign: 'center' as const }}>
        {children}
      </EuiFlexItem>
    </EuiFlexGroup>
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
  const { esQuery } = useServiceMapSearchContext();

  return (
    <ServiceMap
      environment={environment}
      kuery={kuery}
      start={start}
      end={end}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      serviceGroupId={serviceGroup}
      esQuery={esQuery ?? undefined}
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
  const { esQuery } = useServiceMapSearchContext();

  return (
    <ServiceMap
      environment={environment}
      kuery={kuery}
      start={start}
      end={end}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      esQuery={esQuery ?? undefined}
    />
  );
}

export function ServiceMap({
  environment,
  kuery,
  start,
  end,
  rangeFrom,
  rangeTo,
  serviceGroupId,
  esQuery,
}: {
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  /** Raw (possibly relative) URL range — forwarded to "Add to dashboard" for dashboard time seeding. */
  rangeFrom?: string;
  rangeTo?: string;
  serviceGroupId?: string;
  esQuery?: { bool: BoolQuery };
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
            // Drop kuery when navigating to the full map — filtering moves to
            // the Controls API / filter bar on the destination page.
            kuery: '',
            comparisonEnabled: query.comparisonEnabled,
            offset: query.offset,
            serviceGroup: 'serviceGroup' in query ? query.serviceGroup ?? '' : '',
          },
        })
      : undefined;

  const { config } = useApmPluginContext();
  const { onPageReady } = usePerformanceContext();

  const { data, status, error } = useServiceMap({
    environment,
    kuery,
    start,
    end,
    serviceGroupId,
    serviceName,
    esQuery,
  });

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

  const { sloOverviewFlyout, openSloOverviewFlyout, closeSloOverviewFlyout } =
    useSloOverviewFlyout();

  useLayoutEffect(() => {
    if (isFullscreen) {
      applyServiceMapFullScreenBodyClasses(true, bodyClassesToToggle);
      return () => {
        applyServiceMapFullScreenBodyClasses(false, bodyClassesToToggle);
        setUseStoredHeight(false);
      };
    }
  }, [isFullscreen, bodyClassesToToggle]);

  const badgesEnd = useMemo(() => getServiceMapBadgesEnd(end), [end]);

  const { nodes: nodesForGraph, status: badgesStatus } = useServiceMapBadges({
    environment,
    start,
    end: badgesEnd,
    kuery: '',
    nodes: data.nodes,
    nodesStatus: status,
  });

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

  const isEmpty = data.nodes.length === 0;

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

  // Any other fetch failure: surface a real error instead of falling through to an empty graph,
  // which reads as "no data" (review #2). Mirrors the embeddable's error callout.
  if (status === FETCH_STATUS.FAILURE) {
    return (
      <PromptContainer>
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="warning"
          title={i18n.translate('xpack.apm.serviceMap.errorTitle', {
            defaultMessage: 'Unable to load service map',
          })}
          data-test-subj="serviceMapError"
        >
          <p>
            {i18n.translate('xpack.apm.serviceMap.errorDescription', {
              defaultMessage:
                'There was a problem loading the service map. Try refreshing the view.',
            })}
          </p>
        </EuiCallOut>
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

  const isLoading = status === FETCH_STATUS.LOADING || badgesStatus === FETCH_STATUS.LOADING;

  return (
    <ServiceMapSloFlyoutProvider onSloBadgeClick={openSloOverviewFlyout}>
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
            {isLoading && <LoadingSpinner />}
            <ServiceMapGraph
              height={mapHeight}
              nodes={isLoading ? [] : nodesForGraph}
              edges={isLoading ? [] : data.edges}
              serviceName={serviceName}
              highlightedServiceName={serviceName}
              environment={environment}
              kuery={kuery}
              start={start}
              end={end}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              serviceGroupId={serviceGroupId}
              isFullscreen={isFullscreen}
              onToggleFullscreen={onToggleFullscreen}
              fullMapHref={fullMapHref}
            />
          </div>
        </EuiPanel>
        {sloOverviewFlyout && (
          <SloOverviewFlyout
            serviceName={sloOverviewFlyout.serviceName}
            agentName={sloOverviewFlyout.agentName}
            onClose={closeSloOverviewFlyout}
          />
        )}
      </div>
    </ServiceMapSloFlyoutProvider>
  );
}
