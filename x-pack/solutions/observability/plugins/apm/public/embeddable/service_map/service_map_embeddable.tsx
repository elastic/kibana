/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLoadingSpinner, EuiPanel, useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getDateRange } from '../../context/url_params_context/helpers';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { invalidLicenseMessage, SERVICE_MAP_TIMEOUT_ERROR } from '../../../common/service_map';
import { FETCH_STATUS } from '../../hooks/use_fetcher';
import { useLicenseContext } from '../../context/license/use_license_context';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';
import { LicensePrompt } from '../../components/shared/license_prompt';
import { EmptyPrompt } from '../../components/app/service_map/empty_prompt';
import { TimeoutPrompt } from '../../components/app/service_map/timeout_prompt';
import { DisabledPrompt } from '../../components/app/service_map/disabled_prompt';
import { useServiceMap } from '../../components/app/service_map/use_service_map';
import { ServiceMapGraph } from '../../components/app/service_map/graph';
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
  /** Panel padding. Defaults to "none" for dashboard embeddable; use "s" in alert details context. */
  paddingSize?: 'none' | 's' | 'm' | 'l';
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
  paddingSize = 'none',
}: ServiceMapEmbeddableProps) {
  const license = useLicenseContext();
  const { config } = useApmPluginContext();
  const { euiTheme } = useEuiTheme();

  const { start: resolvedStart, end: resolvedEnd } = useMemo(
    () => getDateRange({ rangeFrom, rangeTo }),
    [rangeFrom, rangeTo]
  );
  const start = resolvedStart ?? rangeFrom;
  const end = resolvedEnd ?? rangeTo;

  const { data, status, error } = useServiceMap({
    environment,
    kuery,
    start,
    end,
    serviceGroupId,
    serviceName,
  });

  // When license is not yet available (e.g. first render or after remount), show loading
  // instead of null to avoid a blank panel while the license observable emits.
  if (!license) {
    return (
      <EuiPanel hasBorder paddingSize="none">
        <div
          data-test-subj="apmServiceMapEmbeddable"
          style={{
            width: '100%',
            minWidth: EMBEDDABLE_MIN_WIDTH,
            maxWidth: '100%',
            height: EMBEDDABLE_MIN_HEIGHT,
            minHeight: EMBEDDABLE_MIN_HEIGHT,
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          <LoadingSpinner />
        </div>
      </EuiPanel>
    );
  }

  if (!isActivePlatinumLicense(license)) {
    return (
      <EuiPanel hasBorder paddingSize="l">
        <LicensePrompt text={invalidLicenseMessage} />
      </EuiPanel>
    );
  }

  if (!config.serviceMapEnabled) {
    return (
      <EuiPanel hasBorder paddingSize="l">
        <DisabledPrompt />
      </EuiPanel>
    );
  }

  const isEmpty = data.nodes.length === 0;
  if (status === FETCH_STATUS.SUCCESS && isEmpty) {
    return (
      <EuiPanel hasBorder paddingSize="l">
        <EmptyPrompt />
      </EuiPanel>
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
      <EuiPanel hasBorder paddingSize="l">
        <TimeoutPrompt isGlobalServiceMap={!serviceName} />
      </EuiPanel>
    );
  }

  if (status === FETCH_STATUS.FAILURE) {
    return (
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

  const mapContent = (
    <div
      data-test-subj="apmServiceMapEmbeddable"
      style={{
        width: '100%',
        minWidth: EMBEDDABLE_MIN_WIDTH,
        maxWidth: '100%',
        minHeight: EMBEDDABLE_MIN_HEIGHT,
        height: EMBEDDABLE_MIN_HEIGHT,
        position: 'relative' as const,
        zIndex: Number(euiTheme.levels.content) + 1,
        display: 'block',
        boxSizing: 'border-box',
      }}
    >
      {status === FETCH_STATUS.LOADING && <LoadingSpinner />}
      <ServiceMapGraph
        height={EMBEDDABLE_MIN_HEIGHT}
        nodes={data.nodes}
        edges={data.edges}
        serviceName={serviceName}
        environment={environment}
        kuery={kuery}
        start={start}
        end={end}
        isFullscreen={false}
        fullMapHref={fullMapHref}
        showMinimap={false}
        showPopover={false}
      />
    </div>
  );

  return (
    <EuiPanel
      hasBorder
      paddingSize={paddingSize}
      style={{
        width: '100%',
        minWidth: EMBEDDABLE_MIN_WIDTH,
        maxWidth: '100%',
        minHeight: EMBEDDABLE_MIN_HEIGHT,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {mapContent}
    </EuiPanel>
  );
}
