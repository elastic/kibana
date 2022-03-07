/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { Redirect } from 'react-router-dom';
import { EuiSteps, EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { useTrackPageview } from '../../../../observability/public';
import { MonitorFields as MonitorFieldsType } from '../../../common/runtime_types';
import { Loader } from '../../components/monitor_management/loader/loader';
import { EditMonitorConfig } from '../../components/monitor_management/edit_monitor_config';
import { useLocations } from '../../components/monitor_management/hooks/use_locations';
import { useMonitorManagementBreadcrumbs } from './use_monitor_management_breadcrumbs';
import { SyntheticsMonitorSavedObject } from '../../../common/types';
import { MONITOR_PATH } from '../../../common/constants/ui';

import { useUrlParams } from '../../hooks/use_url_params';

import { FETCH_STATUS, useFetcher } from '../../../../observability/public';

import {
  hasElasticAgentMonitoringApiKey,
  setElasticAgentMonitoringApiKey,
  getMonitor,
} from '../../state/api';

export const EditElasticAgentMonitorPage: React.FC = () => {
  useTrackPageview({ app: 'uptime', path: 'add-monitor' });
  useTrackPageview({ app: 'uptime', path: 'add-monitor', delay: 15000 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { monitorId } = useParams<{ monitorId: string }>();

  const [useGetUrlParams] = useUrlParams();
  const { elasticAgentId } = useGetUrlParams();

  const { status: hasMonitorStatus } = useFetcher(() => {
    return getMonitor({ id: elasticAgentId });
  }, []);

  const { status: setElasticAgentMonitoringApiKeyStatus } = useFetcher(() => {
    if (isSubmitting) {
      return setElasticAgentMonitoringApiKey();
    }
  }, [isSubmitting]);

  const { status: hasApiKeyStatus, data: hasApiKeyData } = useFetcher(() => {
    return hasElasticAgentMonitoringApiKey();
  }, [setElasticAgentMonitoringApiKeyStatus]);

  const { data, status } = useFetcher<Promise<SyntheticsMonitorSavedObject | undefined>>(() => {
    return getMonitor({ id: Buffer.from(monitorId, 'base64').toString('utf8') });
  }, [monitorId]);

  useEffect(() => {
    if (status !== FETCH_STATUS.LOADING) {
      setIsSubmitting(false);
    }
  }, [status]);

  const hasApiKey = hasApiKeyData?.hasApiKey;

  const monitor = data?.attributes as MonitorFieldsType;

  const { error, loading: locationsLoading, locations } = useLocations();

  useMonitorManagementBreadcrumbs({ isEditMonitor: true });

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
                  <EditMonitorConfig monitor={monitor} isElasticAgentMonitor={true} />
                </>
              ),
            },
          ]}
        />
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
