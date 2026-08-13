/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuPrimaryActionItem } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALL_VALUES_SELECTED, createExploratoryViewUrl } from '@kbn/exploratory-view-plugin/public';
import { useMemo } from 'react';
import { isMobileAgentName, isRumAgentName } from '../../../../../common/agent_name';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
} from '../../../../../common/es_fields/apm';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../common/environment_filter_values';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';

function getEnvironmentDefinition(environment: string) {
  switch (environment) {
    case ENVIRONMENT_ALL.value:
      return { [SERVICE_ENVIRONMENT]: [ALL_VALUES_SELECTED] };
    case ENVIRONMENT_NOT_DEFINED.value:
    default:
      return { [SERVICE_ENVIRONMENT]: [environment] };
  }
}

/** Builds the Explore data primary AppMenu action for RUM/mobile service pages, or undefined. */
export function useAnalyzeDataMenuItem(): AppMenuPrimaryActionItem | undefined {
  const { agentName, serviceName } = useApmServiceContext();
  const { services } = useKibana();

  const {
    query: { rangeFrom, rangeTo, environment },
  } = useAnyOfApmParams('/services/{serviceName}', '/mobile-services/{serviceName}');

  const basepath = services.http?.basePath.get();
  const canShowDashboard = services.application?.capabilities.dashboard_v2.show;

  return useMemo(() => {
    if (
      !(isRumAgentName(agentName) || isMobileAgentName(agentName)) ||
      !rangeFrom ||
      !rangeTo ||
      !canShowDashboard
    ) {
      return undefined;
    }

    const href = createExploratoryViewUrl(
      {
        reportType: 'kpi-over-time',
        allSeries: [
          {
            name: `${serviceName}-response-latency`,
            selectedMetricField: TRANSACTION_DURATION,
            dataType: isRumAgentName(agentName) ? 'ux' : 'mobile',
            time: { from: rangeFrom, to: rangeTo },
            reportDefinitions: {
              [SERVICE_NAME]: [serviceName],
              ...(environment ? getEnvironmentDefinition(environment) : {}),
            },
            operationType: 'average',
          },
        ],
      },
      basepath
    );

    return {
      id: 'exploreData',
      label: i18n.translate('xpack.apm.analyzeDataButton.label', {
        defaultMessage: 'Explore data',
      }),
      iconType: 'chartBarVerticalStack',
      href,
      testId: 'apmAnalyzeDataButtonExploreDataButton',
      tooltipContent: i18n.translate('xpack.apm.analyzeDataButton.tooltip', {
        defaultMessage:
          'Go to Explore Data, where you can select and filter result data in any dimension and look for the cause or impact of performance problems.',
      }),
    };
  }, [agentName, basepath, canShowDashboard, environment, rangeFrom, rangeTo, serviceName]);
}
