/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { createExploratoryViewUrl } from '@kbn/exploratory-view-plugin/public';
import { ALL_VALUES_SELECTED } from '@kbn/exploratory-view-plugin/public';
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

export function AnalyzeDataButton() {
  const { agentName, serviceName } = useApmServiceContext();
  const { services } = useKibana();

  const {
    query: { rangeFrom, rangeTo, environment },
  } = useAnyOfApmParams('/services/{serviceName}', '/mobile-services/{serviceName}');

  const basepath = services.http?.basePath.get();
  const canShowDashboard = services.application?.capabilities.dashboard_v2.show;

  if (
    (isRumAgentName(agentName) || isMobileAgentName(agentName)) &&
    rangeFrom &&
    canShowDashboard &&
    rangeTo
  ) {
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

    return (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.apm.analyzeDataButton.tooltip', {
          defaultMessage:
            'Go to Explore Data, where you can select and filter result data in any dimension and look for the cause or impact of performance problems.',
        })}
      >
        <EuiButtonEmpty
          data-test-subj="apmAnalyzeDataButtonExploreDataButton"
          href={href}
          iconType="visBarVerticalStacked"
        >
          {i18n.translate('xpack.apm.analyzeDataButton.label', {
            defaultMessage: 'Explore data',
          })}
        </EuiButtonEmpty>
      </EuiToolTip>
    );
  }

  return null;
}
