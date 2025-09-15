/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePerformanceContext } from '@kbn/ebt-tools';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel, EuiSpacer } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { apmEnableServiceMapApiV2 } from '@kbn/observability-plugin/common';
import { useEditableSettings } from '@kbn/observability-shared-plugin/public';
import { Subscription } from 'rxjs';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import { invalidLicenseMessage, SERVICE_MAP_TIMEOUT_ERROR } from '../../../../common/service_map';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { useTheme } from '../../../hooks/use_theme';
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
import { useServiceMap } from './use_service_map';
import { TryItButton } from '../../shared/try_it_button';

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
  const theme = useTheme();
  const license = useLicenseContext();
  const serviceName = useServiceName();

  const { config, core } = useApmPluginContext();
  const { onPageReady } = usePerformanceContext();

  const subscriptions = useRef<Subscription>(new Subscription());
  const [isServiceMapApiV2Enabled, setIsServiceMapApiV2Enabled] = useState<boolean>(
    core.settings.client.get(apmEnableServiceMapApiV2)
  );

  useEffect(() => {
    subscriptions.current.add(
      core.settings.client.get$<boolean>(apmEnableServiceMapApiV2).subscribe((value) => {
        setIsServiceMapApiV2Enabled(value);
      })
    );
  }, [core.settings]);

  useEffect(() => {
    const currentSubscriptions = subscriptions.current;
    return () => {
      currentSubscriptions.unsubscribe();
    };
  }, []);

  const { fields, isSaving, saveSingleSetting } = useEditableSettings([apmEnableServiceMapApiV2]);

  const settingsField = fields[apmEnableServiceMapApiV2];
  const isServiceMapV2Enabled = Boolean(settingsField?.savedValue ?? settingsField?.defaultValue);

  const { data, status, error } = useServiceMap({
    environment,
    kuery,
    start,
    end,
    serviceGroupId,
    serviceName,
    isServiceMapApiV2Enabled,
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

  if (status === FETCH_STATUS.SUCCESS && data.elements.length === 0) {
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
      <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
        <TryItButton
          isFeatureEnabled={isServiceMapV2Enabled}
          linkLabel={
            isServiceMapV2Enabled
              ? i18n.translate('xpack.apm.serviceMap.disableServiceMapApiV2', {
                  defaultMessage: 'Disable the new service map API',
                })
              : i18n.translate('xpack.apm.serviceMap.enableServiceMapApiV2', {
                  defaultMessage: 'Enable the new service map API',
                })
          }
          onClick={() => {
            saveSingleSetting(apmEnableServiceMapApiV2, !isServiceMapV2Enabled);
          }}
          isLoading={isSaving}
          popoverContent={
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.apm.serviceMap.serviceMapApiV2PopoverContent', {
                  defaultMessage: 'The new service map API is faster, try it out!',
                })}
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          hideThisContent={i18n.translate('xpack.apm.serviceMap.hideThisContent', {
            defaultMessage:
              'Hide this. The setting can be enabled or disabled in Advanced Settings.',
          })}
          calloutId="showServiceMapV2Callout"
        />
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={true} paddingSize="none">
        <div data-test-subj="serviceMap" style={{ height: heightWithPadding }} ref={ref}>
          <Cytoscape
            elements={data.elements}
            height={heightWithPadding}
            serviceName={serviceName}
            style={getCytoscapeDivStyle(theme, status)}
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
