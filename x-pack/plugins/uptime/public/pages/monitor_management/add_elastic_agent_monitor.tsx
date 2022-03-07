/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { Redirect } from 'react-router-dom';
import { EuiSteps, EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { useTrackPageview } from '../../../../observability/public';
import { ScheduleUnit, DataStream, ConfigKey } from '../../../common/runtime_types';
import { SyntheticsProviders, defaultConfig } from '../../components/fleet_package/contexts';
import { Loader } from '../../components/monitor_management/loader/loader';
import { MonitorConfig } from '../../components/monitor_management/monitor_config/monitor_config';
import { ElasticAgentMonitorFields } from '../../components/monitor_management/monitor_config/elastic_agent/elastic_agent_fields';
import { useLocations } from '../../components/monitor_management/hooks/use_locations';
import { useMonitorManagementBreadcrumbs } from './use_monitor_management_breadcrumbs';
import { MONITOR_PATH } from '../../../common/constants/ui';

import { useUrlParams } from '../../hooks/use_url_params';

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

import { FETCH_STATUS, useFetcher } from '../../../../observability/public';

import {
  hasElasticAgentMonitoringApiKey,
  setElasticAgentMonitoringApiKey,
  getMonitor,
} from '../../state/api';

export const AddElasticAgentMonitorPage: React.FC = () => {
  useTrackPageview({ app: 'uptime', path: 'add-monitor' });
  useTrackPageview({ app: 'uptime', path: 'add-monitor', delay: 15000 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [useGetUrlParams] = useUrlParams();
  const {
    services: { http },
  } = useKibana();
  const { elasticAgentId, monitorName } = useGetUrlParams();
  const url = `${http?.basePath?.publicBaseUrl}/api/fleet/agents/${elasticAgentId}`;

  const { status: hasMonitorStatus } = useFetcher(() => {
    return getMonitor({ id: elasticAgentId });
  }, []);

  const { status } = useFetcher(() => {
    if (isSubmitting) {
      return setElasticAgentMonitoringApiKey();
    }
  }, [isSubmitting]);

  const { status: hasApiKeyStatus, data: hasApiKeyData } = useFetcher(() => {
    return hasElasticAgentMonitoringApiKey();
  }, [status]);

  useEffect(() => {
    if (status !== FETCH_STATUS.LOADING) {
      setIsSubmitting(false);
    }
  }, [status]);

  const hasApiKey = hasApiKeyData?.hasApiKey;

  const { error, loading: locationsLoading, locations } = useLocations();

  useMonitorManagementBreadcrumbs({ isAddMonitor: true });

  return (
    <Loader
      error={Boolean(error) || (locations && locations.length === 0)}
      loading={
        locationsLoading ||
        hasApiKeyStatus === FETCH_STATUS.LOADING ||
        hasMonitorStatus === FETCH_STATUS.LOADING
      }
      loadingTitle={LOADING_LABEL}
      errorTitle={ERROR_HEADING_LABEL}
      errorBody={ERROR_BODY_LABEL}
    >
      {hasMonitorStatus === FETCH_STATUS.SUCCESS ? (
        <Redirect
          to={`${MONITOR_PATH}/${Buffer.from(elasticAgentId, 'utf8').toString('base64')}`}
        />
      ) : (
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
                        Select where to monitor your Elastic Agent from, configure your monitor
                        schedule and add optional tags.
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
      )}
    </Loader>
  );
};

const LOADING_LABEL = i18n.translate('xpack.uptime.monitorManagement.addMonitorLoadingLabel', {
  defaultMessage: 'Loading Monitor Management',
});

const ERROR_HEADING_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.addMonitorLoadingError',
  {
    defaultMessage: 'Error loading monitor management',
  }
);

const ERROR_BODY_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.addMonitorServiceLocationsLoadingError',
  {
    defaultMessage: 'Service locations were not able to be loaded. Please try again later.',
  }
);
