/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import {
  invalidLicenseMessage,
  isActivePlatinumLicense,
} from '../../../../common/service_map';
import { useFetcher } from '../../../hooks/useFetcher';
import { useLicense } from '../../../hooks/useLicense';
import { useTheme } from '../../../hooks/useTheme';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { callApmApi } from '../../../services/rest/createCallApmApi';
import { LicensePrompt } from '../../shared/LicensePrompt';
import { Controls } from './Controls';
import { Cytoscape } from './Cytoscape';
import { getCytoscapeDivStyle } from './cytoscapeOptions';
import { EmptyBanner } from './EmptyBanner';
import { Popover } from './Popover';
import { useRefDimensions } from './useRefDimensions';

interface ServiceMapProps {
  serviceName?: string;
}

export function ServiceMap({ serviceName }: ServiceMapProps) {
  const theme = useTheme();
  const license = useLicense();
  const { urlParams } = useUrlParams();

  const { data = { elements: [] } } = useFetcher(() => {
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

  return isActivePlatinumLicense(license) ? (
    <div
      style={{
        height: height - parseInt(theme.eui.gutterTypes.gutterLarge, 10),
      }}
      ref={ref}
    >
      <Cytoscape
        elements={data?.elements ?? []}
        height={height}
        serviceName={serviceName}
        style={getCytoscapeDivStyle(theme)}
      >
        <Controls />
        {serviceName && <EmptyBanner />}
        <Popover focusedServiceName={serviceName} />
      </Cytoscape>
    </div>
  ) : (
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
        <LicensePrompt text={invalidLicenseMessage} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
