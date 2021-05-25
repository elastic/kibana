/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactChild, useState } from 'react';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useTheme } from '../../../../hooks/use_theme';
import { ContainerType } from '../../../../../common/service_metadata';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { getAgentIcon } from '../../../shared/AgentIcon/get_agent_icon';
import { CloudDetails } from './cloud_details';
import { ContainerDetails } from './container_details';
import { IconPopover } from './icon_popover';
import { ServiceDetails } from './service_details';
import { AlertDetails } from './alert_details';

interface Props {
  serviceName: string;
}

const cloudIcons: Record<string, string> = {
  gcp: 'logoGCP',
  aws: 'logoAWS',
  azure: 'logoAzure',
};

export function getCloudIcon(provider?: string) {
  if (provider) {
    return cloudIcons[provider];
  }
}

export function getContainerIcon(container?: ContainerType) {
  if (!container) {
    return;
  }
  switch (container) {
    case 'Kubernetes':
      return 'logoKubernetes';
    default:
      return 'logoDocker';
  }
}

type Icons = 'service' | 'container' | 'cloud' | 'alerts';

interface PopoverItem {
  key: Icons;
  icon: {
    type?: string;
    color?: string;
    size?: 's' | 'm' | 'l';
  };
  isVisible: boolean;
  title: string;
  component: ReactChild;
}

export function ServiceIcons({ serviceName }: Props) {
  const {
    urlParams: { start, end },
  } = useUrlParams();
  const [
    selectedIconPopover,
    setSelectedIconPopover,
  ] = useState<Icons | null>();

  const theme = useTheme();

  const { alerts } = useApmServiceContext();

  const { data: icons, status: iconsFetchStatus } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/metadata/icons',
          params: {
            path: { serviceName },
            query: { start, end },
          },
        });
      }
    },
    [serviceName, start, end]
  );

  const { data: details, status: detailsFetchStatus } = useFetcher(
    (callApmApi) => {
      if (selectedIconPopover && serviceName && start && end) {
        return callApmApi({
          isCachable: true,
          endpoint: 'GET /api/apm/services/{serviceName}/metadata/details',
          params: {
            path: { serviceName },
            query: { start, end },
          },
        });
      }
    },
    [selectedIconPopover, serviceName, start, end]
  );

  const isLoading = !icons && iconsFetchStatus === FETCH_STATUS.LOADING;

  if (isLoading) {
    return <EuiLoadingSpinner data-test-subj="loading" />;
  }

  const popoverItems: PopoverItem[] = [
    {
      key: 'service',
      icon: {
        type: getAgentIcon(icons?.agentName, theme.darkMode) || 'node',
      },
      isVisible: !!icons?.agentName,
      title: i18n.translate('xpack.apm.serviceIcons.service', {
        defaultMessage: 'Service',
      }),
      component: <ServiceDetails service={details?.service} />,
    },
    {
      key: 'container',
      icon: {
        type: getContainerIcon(icons?.containerType),
      },
      isVisible: !!icons?.containerType,
      title: i18n.translate('xpack.apm.serviceIcons.container', {
        defaultMessage: 'Container',
      }),
      component: <ContainerDetails container={details?.container} />,
    },
    {
      key: 'cloud',
      icon: {
        type: getCloudIcon(icons?.cloudProvider),
      },
      isVisible: !!icons?.cloudProvider,
      title: i18n.translate('xpack.apm.serviceIcons.cloud', {
        defaultMessage: 'Cloud',
      }),
      component: <CloudDetails cloud={details?.cloud} />,
    },
    {
      key: 'alerts',
      icon: {
        type: 'bell',
        color: theme.eui.euiColorDanger,
        size: 'm',
      },
      isVisible: alerts.length > 0,
      title: i18n.translate('xpack.apm.serviceIcons.alerts', {
        defaultMessage: 'Alerts',
      }),
      component: <AlertDetails alerts={alerts} />,
    },
  ];

  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      {popoverItems.map((item) => {
        if (item.isVisible) {
          return (
            <EuiFlexItem grow={false} data-test-subj={item.key} key={item.key}>
              <IconPopover
                isOpen={selectedIconPopover === item.key}
                icon={item.icon}
                detailsFetchStatus={detailsFetchStatus}
                title={item.title}
                onClick={() => {
                  setSelectedIconPopover((prevSelectedIconPopover) =>
                    item.key === prevSelectedIconPopover ? null : item.key
                  );
                }}
                onClose={() => {
                  setSelectedIconPopover(null);
                }}
              >
                {item.component}
              </IconPopover>
            </EuiFlexItem>
          );
        }
      })}
    </EuiFlexGroup>
  );
}
