/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { isElasticAgentName } from '@kbn/elastic-agent-utils/src/agent_guards';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  isJavaAgentName,
  isJRubyAgentName,
  isAWSLambdaAgentName,
} from '../../../../common/agent_name';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ServerlessMetrics } from './serverless_metrics';
import { ServiceMetrics } from './service_metrics';
import { JvmMetricsOverview } from './jvm_metrics_overview';
import { JsonMetricsDashboard } from './static_dashboard';
import { hasDashboardFile } from './static_dashboard/helper';
import { useAdHocApmDataView } from '../../../hooks/use_adhoc_apm_data_view';
import { isLogsOnlySignal } from '../../../utils/get_signal_type';
import { ServiceTabEmptyState } from '../service_tab_empty_state';

export function Metrics() {
  const { agentName, runtimeName, serverlessType, serviceEntitySummary, telemetrySdkName } =
    useApmServiceContext();
  const isAWSLambda = isAWSLambdaAgentName(serverlessType);
  const { dataView } = useAdHocApmDataView();
  const [hasDashboard, setHasDashboard] = useState<boolean>(false);

  useEffect(() => {
    async function loadDashboardFile() {
      const loadDashboard = await hasDashboardFile({
        agentName,
        telemetrySdkName,
        runtimeName,
        serverlessType,
      });
      setHasDashboard(loadDashboard);
    }
    loadDashboardFile();
  }, [agentName, runtimeName, serverlessType, telemetrySdkName]);

  const hasLogsOnlySignal =
    serviceEntitySummary?.dataStreamTypes && isLogsOnlySignal(serviceEntitySummary.dataStreamTypes);

  if (hasLogsOnlySignal) {
    return <ServiceTabEmptyState id="metrics" />;
  }

  if (isAWSLambda) {
    return <ServerlessMetrics />;
  }

  if (!hasDashboard && !isElasticAgentName(agentName ?? '')) {
    // TODO move and replace the fallback message here
    return (
      <EuiCallOut
        title={i18n.translate('xpack.apm.metrics.emptyState.title', {
          defaultMessage: 'No dashboard found',
        })}
        iconType="iInCircle"
      >
        <FormattedMessage
          id="xpack.apm.metrics.emptyState.explanation"
          defaultMessage="We could not find a dashboard matching the metrics of your service. To learn more check the {link}"
          values={{
            link: (
              <EuiLink
                data-test-subj="apmServiceMetricsDocumentationOfApmMetricsLink"
                // TODO add to docLinks like docLinks.links.apm.metrics or whatever link we decide to use
                href="https://www.elastic.co/guide/en/observability/current/apm-metrics.html"
                target="_blank"
              >
                {i18n.translate('xpack.apm.metrics.emptyState.explanation.documantationLink', {
                  defaultMessage: 'APM metrics documentation',
                })}
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
    );
  }
  // if (!hasDashboardFile && telemetrySdkName) {
  // Fallback message here
  // }

  if (hasDashboard && dataView) {
    return (
      <JsonMetricsDashboard
        agentName={agentName}
        runtimeName={runtimeName}
        serverlessType={serverlessType}
        dataView={dataView}
      />
    );
  }

  if (!isAWSLambda && (isJavaAgentName(agentName) || isJRubyAgentName(agentName, runtimeName))) {
    return <JvmMetricsOverview />;
  }

  return <ServiceMetrics />;
}
