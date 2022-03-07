/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSteps, EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { useTrackPageview } from '../../../../observability/public';
import { ScheduleUnit, DataStream, ConfigKey } from '../../../common/runtime_types';
import { SyntheticsProviders, defaultConfig } from '../../components/fleet_package/contexts';
import { MonitorConfig } from '../../components/monitor_management/monitor_config/monitor_config';
import { ElasticAgentMonitorFields } from '../../components/monitor_management/monitor_config/elastic_agent/elastic_agent_fields';

import { useUrlParams } from '../../hooks/use_url_params';

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

import { FETCH_STATUS, useFetcher } from '../../../../observability/public';

import { hasElasticAgentMonitoringApiKey, setElasticAgentMonitoringApiKey } from '../../state/api';

export const AddElasticAgentMonitorConfig: React.FC = () => {
  useTrackPageview({ app: 'uptime', path: 'add-monitor' });
  useTrackPageview({ app: 'uptime', path: 'add-monitor', delay: 15000 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [useGetUrlParams] = useUrlParams();
  const {
    services: { http },
  } = useKibana();
  const { elasticAgentId, monitorName } = useGetUrlParams();
  const url = `${http?.basePath?.publicBaseUrl}/api/fleet/agents/${elasticAgentId}`;

  const { status } = useFetcher(() => {
    if (isSubmitting) {
      return setElasticAgentMonitoringApiKey();
    }
  }, [isSubmitting]);

  const { data: hasApiKeyData } = useFetcher(() => {
    return hasElasticAgentMonitoringApiKey();
  }, [status]);

  useEffect(() => {
    if (status !== FETCH_STATUS.LOADING) {
      setIsSubmitting(false);
    }
  }, [status]);

  const hasApiKey = hasApiKeyData?.hasApiKey;

  return (
    <SyntheticsProviders
      policyDefaultValues={{
        allowedScheduleUnits: [ScheduleUnit.MINUTES],
        defaultName: Buffer.from(monitorName || '', 'base64').toString('utf8'),
        defaultMonitorType: DataStream.HTTP,
      }}
      httpDefaultValues={{
        ...defaultConfig[DataStream.HTTP],
        [ConfigKey.URLS]: url || '',
        [ConfigKey.IS_ELASTIC_AGENT_MONITOR]: true,
        [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: ['error', 'offline'],
      }}
    >
      <EuiSteps
        steps={[
          {
            title: 'Step 1 - Generate API Key',
            children: (
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <p>Generate an Api Key to monitor your Elastic Agents from Kibana</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={() => setIsSubmitting(true)} disabled={hasApiKey}>
                    Generate Kibana api key
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            status: hasApiKey ? 'complete' : 'incomplete', // also handle errors with toast
          },
          {
            title: 'Step 2 - Configure monitor',
            children: (
              <>
                <EuiText>
                  <p>
                    Select where to monitor your Elastic Agent from, configure your monitor schedule
                    and add optional tags.
                  </p>
                </EuiText>
                <EuiSpacer />
                <MonitorConfig isEdit={false} fields={ElasticAgentMonitorFields} />
              </>
            ),
          },
        ]}
      />
    </SyntheticsProviders>
  );
};
