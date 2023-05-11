/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
} from '@elastic/eui';
import React, { ReactNode, useContext, useEffect } from 'react';
import { Environment } from '../../../../common/environment_rt';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import { invalidLicenseMessage } from '../../../../common/service_map';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { useAnyOfApmParams, useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { useTheme } from '../../../hooks/use_theme';
import { useTimeRange } from '../../../hooks/use_time_range';
import { LicensePrompt } from '../../shared/license_prompt';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { Controls } from './controls';
import { ControlsBottom } from './controls_bottom';
import { getCytoscapeDivStyle } from './cytoscape_options';
import { DisabledPrompt } from './disabled_prompt';
import { useRefDimensions } from './use_ref_dimensions';
import { useServiceName } from '../../../hooks/use_service_name';
import { CytoscapeContext } from '../../../context/cytoscape_context';
import { ControlsTools } from './controls_tools';

function PromptContainer({ children }: { children: ReactNode }) {
  return (
    <>
      <SearchBar showUnifiedSearchBar={false} />
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceAround"
        // Set the height to give it some top margin
        style={{ height: '60vh' }}
      >
        <EuiFlexItem
          grow={false}
          style={{ width: 600, textAlign: 'center' as const }}
        >
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

function LoadingSpinner() {
  return (
    <EuiLoadingSpinner
      size="xl"
      style={{ position: 'absolute', top: '50%', left: '50%' }}
    />
  );
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
  return (
    <ServiceMap
      environment={environment}
      kuery={kuery}
      start={start}
      end={end}
    />
  );
}

export function ServiceMap({
  environment,
  kuery,
  start,
  end,
  serviceGroupId,
  isOpen,
}: {
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  serviceGroupId?: string;
  isOpen: boolean;
}) {
  const theme = useTheme();
  const license = useLicenseContext();
  const status = FETCH_STATUS.SUCCESS;
  const serviceName = useServiceName();
  const [mapSize, setMapSize] = useLocalStorage<'big' | 'small'>(
    'mapSize',
    'small'
  );
  const { config } = useApmPluginContext();
  const data = { elements: [] };
  const { ref, height } = useRefDimensions();
  const dimensions =
    mapSize === 'big'
      ? { height: 900, width: 900 }
      : { height: 300, width: 300 };
  const cy = useContext(CytoscapeContext);

  useEffect(() => {
    if (ref.current) {
      cy.mount(ref.current);
    }

    return () => {
      cy.unmount();
    };
  });
  // Temporary hack to work around bottom padding introduced by EuiPage
  // const PADDING_BOTTOM = 24;
  // const heightWithPadding = height - PADDING_BOTTOM;
  const heightWithPadding = dimensions.height;
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

  // if (status === FETCH_STATUS.SUCCESS && data.elements.length === 0) {
  //   return (
  //     <PromptContainer>
  //       <EmptyPrompt />
  //     </PromptContainer>
  //   );
  // }

  // if (
  //   status === FETCH_STATUS.FAILURE &&
  //   error &&
  //   'body' in error &&
  //   error.body?.statusCode === 500 &&
  //   error.body?.message === SERVICE_MAP_TIMEOUT_ERROR
  // ) {
  //   return (
  //     <PromptContainer>
  //       <TimeoutPrompt isGlobalServiceMap={!serviceName} />
  //     </PromptContainer>
  //   );
  // }

  return (
    <EuiPanel
      hasBorder={true}
      paddingSize="none"
      style={{
        position: 'absolute',
        top: 50,
        right: 0,
        width: dimensions.width,
        height: heightWithPadding,
        display: isOpen ? 'block' : 'none',
      }}
    >
      <div
        data-test-subj="ServiceMap"
        style={{
          ...getCytoscapeDivStyle(theme, status),
          height: heightWithPadding,
          width: dimensions.width,
        }}
        ref={ref}
      />
      <Controls />
      <ControlsBottom mapSize={mapSize} setMapSize={setMapSize} />
      <ControlsTools />
    </EuiPanel>
  );
}
