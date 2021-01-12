/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React, { PropsWithChildren, ReactNode } from 'react';
import styled from 'styled-components';
import { useTrackPageview } from '../../../../../observability/public';
import {
  invalidLicenseMessage,
  isActivePlatinumLicense,
  SERVICE_MAP_TIMEOUT_ERROR,
} from '../../../../common/service_map';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { useTheme } from '../../../hooks/use_theme';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { callApmApi } from '../../../services/rest/createCallApmApi';
import { DatePicker } from '../../shared/DatePicker';
import { LicensePrompt } from '../../shared/LicensePrompt';
import { Controls } from './Controls';
import { Cytoscape } from './Cytoscape';
import { getCytoscapeDivStyle } from './cytoscape_options';
import { EmptyBanner } from './EmptyBanner';
import { EmptyPrompt } from './empty_prompt';
import { Popover } from './Popover';
import { TimeoutPrompt } from './timeout_prompt';
import { useRefDimensions } from './useRefDimensions';

interface ServiceMapProps {
  serviceName?: string;
}

const ServiceMapDatePickerFlexGroup = styled(EuiFlexGroup)`
  padding: ${({ theme }) => theme.eui.euiSizeM};
  border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
  margin: 0;
`;

function DatePickerSection() {
  return (
    <ServiceMapDatePickerFlexGroup justifyContent="flexEnd" gutterSize="s">
      <EuiFlexItem grow={false}>
        <DatePicker />
      </EuiFlexItem>
    </ServiceMapDatePickerFlexGroup>
  );
}

function PromptContainer({ children }: { children: ReactNode }) {
  return (
    <>
      <DatePickerSection />
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

export function ServiceMap({
  serviceName,
}: PropsWithChildren<ServiceMapProps>) {
  const theme = useTheme();
  const license = useLicenseContext();
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
        endpoint: 'GET /api/apm/service-map',
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
    <>
      <DatePickerSection />
      <div data-test-subj="ServiceMap" style={{ height }} ref={ref}>
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
    </>
  );
}
