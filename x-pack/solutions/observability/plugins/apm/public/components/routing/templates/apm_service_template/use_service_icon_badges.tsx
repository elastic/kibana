/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import type { AppHeaderBadge } from '@kbn/app-header';
import type { CloudProvider } from '@kbn/custom-icons';
import { getAgentIcon, getCloudProviderIcon, getServerlessIcon } from '@kbn/custom-icons';
import { i18n } from '@kbn/i18n';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import React, { useMemo } from 'react';
import { isOpenTelemetryAgentName } from '../../../../../common/agent_name';
import { ServerlessType } from '../../../../../common/serverless';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { APM_EBT_ACTIONS, SERVICE_HEADER_EBT_ELEMENTS } from '../../../app/ebt_constants';
import { getContainerIcon } from '../../../shared/service_icons';
import { ServiceIconBadge } from '../../../shared/service_icons/service_icon_badge';

interface Props {
  serviceName: string;
  environment: string;
  start: string;
  end: string;
}

function getServerlessTitle(serverlessType?: ServerlessType): string {
  switch (serverlessType) {
    case ServerlessType.AWS_LAMBDA: {
      return i18n.translate('xpack.apm.serviceIcons.aws_lambda', {
        defaultMessage: 'AWS Lambda',
      });
    }
    case ServerlessType.AZURE_FUNCTIONS: {
      return i18n.translate('xpack.apm.serviceIcons.azure_functions', {
        defaultMessage: 'Azure Functions',
      });
    }
    default: {
      return i18n.translate('xpack.apm.serviceIcons.serverless', {
        defaultMessage: 'Serverless',
      });
    }
  }
}

function useServiceIconCandidates({
  serviceName,
  start,
  end,
}: Pick<Props, 'serviceName' | 'start' | 'end'>) {
  const isDarkMode = useKibanaIsDarkMode();

  const { data: icons, status: iconsFetchStatus } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi('GET /internal/apm/services/{serviceName}/metadata/icons', {
          params: {
            path: { serviceName },
            query: { start, end },
          },
        });
      }
    },
    [serviceName, start, end]
  );

  const isLoading = !icons && iconsFetchStatus === FETCH_STATUS.LOADING;

  const candidates = useMemo(() => {
    return [
      {
        key: 'service' as const,
        iconType: getAgentIcon(icons?.agentName, isDarkMode) || 'vectorTriangle',
        title: i18n.translate('xpack.apm.serviceIcons.service', {
          defaultMessage: 'Service',
        }),
        isVisible: !!icons?.agentName,
      },
      {
        key: 'opentelemetry' as const,
        iconType: getAgentIcon('opentelemetry', isDarkMode),
        title: i18n.translate('xpack.apm.serviceIcons.opentelemetry', {
          defaultMessage: 'OpenTelemetry',
        }),
        isVisible: !!icons?.agentName && isOpenTelemetryAgentName(icons.agentName),
      },
      {
        key: 'container' as const,
        iconType: getContainerIcon(icons?.containerType),
        title: icons?.containerType
          ? String(icons.containerType)
          : i18n.translate('xpack.apm.serviceIcons.container', {
              defaultMessage: 'Container',
            }),
        isVisible: !!icons?.containerType,
      },
      {
        key: 'serverless' as const,
        iconType: getServerlessIcon(icons?.serverlessType) || 'vectorTriangle',
        title: getServerlessTitle(icons?.serverlessType),
        isVisible: !!icons?.serverlessType,
      },
      {
        key: 'cloud' as const,
        iconType: getCloudProviderIcon(icons?.cloudProvider as CloudProvider),
        title: icons?.cloudProvider
          ? String(icons.cloudProvider)
          : i18n.translate('xpack.apm.serviceIcons.cloud', {
              defaultMessage: 'Cloud',
            }),
        isVisible: !!icons?.cloudProvider,
      },
    ].filter((item) => item.isVisible && item.iconType);
  }, [icons, isDarkMode]);

  return { candidates, isLoading };
}

/**
 * Logos as AppHeader `badges` (small images next to the title; details in popovers).
 */
export function useServiceIconBadges({
  serviceName,
  environment,
  start,
  end,
}: Props): AppHeaderBadge[] {
  const { candidates, isLoading } = useServiceIconCandidates({ serviceName, start, end });

  return useMemo(() => {
    if (isLoading) {
      return [
        {
          label: i18n.translate('xpack.apm.serviceDetails.serviceIconsLoadingBadgeLabel', {
            defaultMessage: 'Loading service icons',
          }),
          renderCustomBadge: () => <EuiLoadingSpinner data-test-subj="loading" size="m" />,
        },
      ];
    }

    return candidates.map((item) => ({
      label: item.title,
      color: 'hollow' as const,
      tooltip: item.title,
      'data-test-subj': item.key,
      renderCustomBadge: () => (
        <ServiceIconBadge
          iconKey={item.key}
          iconType={item.iconType!}
          title={item.title}
          serviceName={serviceName}
          environment={environment}
          start={start}
          end={end}
          ebt={{
            action: APM_EBT_ACTIONS.VIEW_SERVICE_METADATA,
            element: SERVICE_HEADER_EBT_ELEMENTS.ICON_BADGE,
            detail: item.key,
          }}
        />
      ),
    }));
  }, [candidates, end, environment, isLoading, serviceName, start]);
}
