/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import {
  invalidLicenseMessage,
  isActivePlatinumLicense,
  SERVICE_MAP_TIMEOUT_ERROR,
} from '../../../../common/service_map';
import { FETCH_STATUS, useFetcher } from '../../../hooks/useFetcher';
import { useLicense } from '../../../hooks/useLicense';
import { useTheme } from '../../../hooks/useTheme';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { callApmApi } from '../../../services/rest/createCallApmApi';
import { LicensePrompt } from '../../shared/LicensePrompt';
import { Controls } from './Controls';
import { Cytoscape } from './Cytoscape';
import { getCytoscapeDivStyle } from './cytoscape_options';
import { EmptyBanner } from './EmptyBanner';
import { EmptyPrompt } from './empty_prompt';
import { TimeoutPrompt } from './timeout_prompt';
import { Popover } from './Popover';
import { useRefDimensions } from './useRefDimensions';

interface ServiceMapProps {
  serviceName?: string;
}

function PromptContainer({ children }: { children: ReactNode }) {
  return (
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

export function ServiceMap({ serviceName }: ServiceMapProps) {
  const theme = useTheme();
  const license = useLicense();
  const { urlParams } = useUrlParams();

  const { data = { elements: [] }, status, error } = useFetcher(() => {
    // When we don't have a license or a valid license, don't make the request.
    if (!license || !isActivePlatinumLicense(license)) {
      return;
    }

    const { start, end, environment } = urlParams;
    if (start && end) {
      return callApmApi({
        isCachable: false,
        pathname: '/api/apm/service-map',
        params: {
          query: {
            start,
            end,
            environment,
            serviceName,
          },
        },
      });
    }
  }, [license, serviceName, urlParams]);

  const { ref, height } = useRefDimensions();

  useTrackPageview({ app: 'apm', path: 'service_map' });
  useTrackPageview({ app: 'apm', path: 'service_map', delay: 15000 });

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
    error.body.statusCode === 500 &&
    error.body.message === SERVICE_MAP_TIMEOUT_ERROR
  ) {
    return (
      <PromptContainer>
        <TimeoutPrompt isGlobalServiceMap={!serviceName} />
      </PromptContainer>
    );
  }

  return (
    <div
      data-test-subj="ServiceMap"
      style={{
        height: height - parseInt(theme.eui.gutterTypes.gutterLarge, 10),
      }}
      ref={ref}
    >
      <Cytoscape
        elements={data.elements}
        height={height}
        serviceName={serviceName}
        style={getCytoscapeDivStyle(theme, status)}
      >
        <Controls />
        {serviceName && <EmptyBanner />}
        {status === FETCH_STATUS.LOADING && <LoadingSpinner />}
        <Popover focusedServiceName={serviceName} />
      </Cytoscape>
    </div>
  );
}
