/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { getAgentIcon } from '../../../shared/AgentIcon/get_agent_icon';
import { CloudDetails } from './cloud_details';
import { ContainerDetails } from './container_details';
import { IconPopover } from './icon_popover';
import { ServiceDetails } from './service_details';
import { ServiceDetailsContextProvider } from './service_details_context';

interface Props {
  serviceName: string;
}

const cloudIcons: Record<string, string> = {
  gcp: 'logoGCP',
  aws: 'logoAWS',
  azure: 'logoAzure',
};

function getCloudIcon(provider?: string) {
  if (provider) {
    return cloudIcons[provider];
  }
}

export function ServiceIcons({ serviceName }: Props) {
  const {
    urlParams: { start, end },
    uiFilters,
  } = useUrlParams();

  const { data: icons, status: iconsFetchStatus } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/icons',
          params: {
            path: { serviceName },
            query: { start, end, uiFilters: JSON.stringify(uiFilters) },
          },
        });
      }
    },
    [serviceName, start, end, uiFilters]
  );

  const isLoading =
    !icons &&
    (iconsFetchStatus === FETCH_STATUS.LOADING ||
      iconsFetchStatus === FETCH_STATUS.PENDING);

  const cloudIcon = getCloudIcon(icons?.cloud);
  const containerIcon =
    icons?.container === 'Kubernetes' ? 'logoKubernetes' : 'logoDocker';

  return (
    <ServiceDetailsContextProvider serviceName={serviceName}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h1>{serviceName}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isLoading ? (
            <EuiLoadingSpinner />
          ) : (
            <EuiFlexGroup gutterSize="s">
              {icons?.agentName && (
                <EuiFlexItem grow={false}>
                  <IconPopover
                    icon={getAgentIcon(icons.agentName) || 'node'}
                    title={i18n.translate('xpack.apm.serviceIcons.service', {
                      defaultMessage: 'Service',
                    })}
                  >
                    <ServiceDetails />
                  </IconPopover>
                </EuiFlexItem>
              )}
              {containerIcon && (
                <EuiFlexItem grow={false}>
                  <IconPopover
                    icon={containerIcon}
                    title={i18n.translate('xpack.apm.serviceIcons.container', {
                      defaultMessage: 'Container',
                    })}
                  >
                    <ContainerDetails />
                  </IconPopover>
                </EuiFlexItem>
              )}
              {cloudIcon && (
                <EuiFlexItem grow={false}>
                  <IconPopover
                    icon={cloudIcon}
                    title={i18n.translate('xpack.apm.serviceIcons.cloud', {
                      defaultMessage: 'Cloud',
                    })}
                  >
                    <CloudDetails />
                  </IconPopover>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </ServiceDetailsContextProvider>
  );
}
