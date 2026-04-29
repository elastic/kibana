/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getDateRange } from '../../context/url_params_context/helpers';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { invalidLicenseMessage, SERVICE_MAP_TIMEOUT_ERROR } from '../../../common/service_map';
import { FETCH_STATUS } from '../../hooks/use_fetcher';
import { useLicenseContext } from '../../context/license/use_license_context';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';
import { EmptyPrompt } from '../../components/app/service_map/empty_prompt';
import { TimeoutPrompt } from '../../components/app/service_map/timeout_prompt';
import { useServiceMap } from '../../components/app/service_map/use_service_map';
import { useServiceMapBadges } from '../../components/app/service_map/use_service_map_badges';
import { ServiceMapGraph } from '../../components/app/service_map/graph';
import { ServiceMapSloFlyoutProvider } from '../../components/app/service_map/service_map_slo_flyout_context';
import {
  SloOverviewFlyout,
  useSloOverviewFlyout,
} from '../../components/shared/slo_overview_flyout';
import { getServiceMapUrl } from './get_service_map_url';
import type { Environment } from '../../../common/environment_rt';

const EMBEDDABLE_MIN_HEIGHT = 400;
const EMBEDDABLE_MIN_WIDTH = 600;

export interface ServiceMapEmbeddableProps {
  rangeFrom: string;
  rangeTo: string;
  environment?: Environment;
  kuery?: string;
  serviceName?: string;
  serviceGroupId?: string;
  core: CoreStart;
  onBlockingError?: (error: Error | undefined) => void;
}

function LoadingSpinner() {
  return (
    <EuiLoadingSpinner
      size="xl"
      style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
    />
  );
}

export function ServiceMapEmbeddable({
  rangeFrom,
  rangeTo,
  environment = ENVIRONMENT_ALL.value,
  kuery = '',
  serviceName,
  serviceGroupId,
  core,
  onBlockingError,
}: ServiceMapEmbeddableProps) {
  const license = useLicenseContext();
  const { config } = useApmPluginContext();

  const hasValidLicense = license && isActivePlatinumLicense(license);
  const isServiceMapEnabled = config.serviceMapEnabled;

  useEffect(() => {
    if (license && !hasValidLicense) {
      onBlockingError?.(new Error(invalidLicenseMessage));
    } else if (!isServiceMapEnabled) {
      onBlockingError?.(
        new Error(
          i18n.translate('xpack.apm.serviceMapEmbeddable.disabledError', {
            defaultMessage: 'Service map is disabled in APM configuration',
          })
        )
      );
    } else {
      onBlockingError?.(undefined);
    }
  }, [license, hasValidLicense, isServiceMapEnabled, onBlockingError]);

  const { start, end } = useMemo(() => {
    const { start: parsedStart, end: parsedEnd } = getDateRange({ rangeFrom, rangeTo });
    return { start: parsedStart ?? rangeFrom, end: parsedEnd ?? rangeTo };
  }, [rangeFrom, rangeTo]);

  const { sloOverviewFlyout, openSloOverviewFlyout, closeSloOverviewFlyout } =
    useSloOverviewFlyout();

  const { data, status, error } = useServiceMap({
    environment,
    kuery,
    start,
    end,
    serviceGroupId,
    serviceName,
  });

  const { nodes: nodesForGraph, status: badgesStatus } = useServiceMapBadges({
    environment,
    start,
    end,
    kuery,
    nodes: data.nodes,
    nodesStatus: status,
  });

  if (!license || !isActivePlatinumLicense(license) || !config.serviceMapEnabled) {
    return (
      <div
        data-test-subj="apmServiceMapEmbeddable"
        style={{
          width: '100%',
          height: '100%',
          minWidth: EMBEDDABLE_MIN_WIDTH,
          minHeight: EMBEDDABLE_MIN_HEIGHT,
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        <LoadingSpinner />
      </div>
    );
  }

  const isEmpty = data.nodes.length === 0;
  if (status === FETCH_STATUS.SUCCESS && isEmpty) {
    return (
      <div data-test-subj="apmServiceMapEmbeddable">
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
          <EmptyPrompt />
        </EuiPanel>
      </div>
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
      <div data-test-subj="apmServiceMapEmbeddable">
        <EuiPanel hasBorder paddingSize="l">
          <TimeoutPrompt isGlobalServiceMap={!serviceName} />
        </EuiPanel>
      </div>
    );
  }

  if (status === FETCH_STATUS.FAILURE) {
    return (
      <div data-test-subj="apmServiceMapEmbeddable">
        <EuiPanel hasBorder paddingSize="l">
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="warning"
            title={i18n.translate('xpack.apm.serviceMapEmbeddable.errorTitle', {
              defaultMessage: 'Unable to load service map',
            })}
            data-test-subj="apmServiceMapEmbeddableError"
          >
            <p>
              {i18n.translate('xpack.apm.serviceMapEmbeddable.errorDescription', {
                defaultMessage:
                  'There was a problem loading the service map. Try refreshing the view.',
              })}
            </p>
          </EuiCallOut>
        </EuiPanel>
      </div>
    );
  }

  const fullMapHref = getServiceMapUrl(core, {
    rangeFrom,
    rangeTo,
    environment,
    kuery,
    serviceName,
    serviceGroupId,
  });

  const isLoading = status === FETCH_STATUS.LOADING || badgesStatus === FETCH_STATUS.LOADING;

  return (
    <ServiceMapSloFlyoutProvider onSloBadgeClick={openSloOverviewFlyout}>
      <div
        data-test-subj="apmServiceMapEmbeddable"
        style={{
          width: '100%',
          height: '100%',
          minWidth: EMBEDDABLE_MIN_WIDTH,
          minHeight: EMBEDDABLE_MIN_HEIGHT,
          position: 'relative' as const,
          boxSizing: 'border-box',
        }}
      >
        {isLoading && <LoadingSpinner />}
        <ServiceMapGraph
          height="100%"
          nodes={isLoading ? [] : nodesForGraph}
          edges={isLoading ? [] : data.edges}
          serviceName={serviceName}
          highlightedServiceName={serviceName}
          environment={environment}
          kuery={kuery}
          start={start}
          end={end}
          isFullscreen={false}
          fullMapHref={fullMapHref}
          isEmbedded
        />
      </div>
      {sloOverviewFlyout && (
        <SloOverviewFlyout
          serviceName={sloOverviewFlyout.serviceName}
          agentName={sloOverviewFlyout.agentName}
          onClose={closeSloOverviewFlyout}
        />
      )}
    </ServiceMapSloFlyoutProvider>
  );
}
