/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { EuiSpacer, EuiForm, EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import useMount from 'react-use/lib/useMount';
import { i18n } from '@kbn/i18n';
import { ANOMALY_RESULT_TYPE, ANOMALY_THRESHOLD } from '@kbn/ml-utils';
import { JobSelectorControl } from './job_selector';
import { useMlKibana } from '../application/contexts/kibana';
import { jobsApiProvider } from '../application/services/ml_api_service/jobs';
import { HttpService } from '../application/services/http_service';
import { SeverityControl } from './severity_control';
import { ResultTypeSelector } from './result_type_selector';
import { alertingApiProvider } from '../application/services/ml_api_service/alerting';
import { PreviewAlertCondition } from './preview_alert_condition';
import { MlAnomalyDetectionAlertParams } from '../../common/types/alerts';
import { InterimResultsControl } from './interim_results_control';
import { ConfigValidator } from './config_validator';
import { CombinedJobWithStats } from '../../common/types/anomaly_detection_jobs';

interface MlAnomalyAlertTriggerProps {
  alertParams: MlAnomalyDetectionAlertParams;
  setAlertParams: <T extends keyof MlAnomalyDetectionAlertParams>(
    key: T,
    value: MlAnomalyDetectionAlertParams[T]
  ) => void;
  setAlertProperty: (prop: string, update: Partial<MlAnomalyDetectionAlertParams>) => void;
  errors: Record<keyof MlAnomalyDetectionAlertParams, string[]>;
  alertInterval: string;
}

const MlAnomalyAlertTrigger: FC<MlAnomalyAlertTriggerProps> = ({
  alertParams,
  setAlertParams,
  setAlertProperty,
  errors,
  alertInterval,
}) => {
  const {
    services: { http },
    notifications: { toasts },
  } = useMlKibana();
  const mlHttpService = useMemo(() => new HttpService(http), [http]);
  const adJobsApiService = useMemo(() => jobsApiProvider(mlHttpService), [mlHttpService]);
  const alertingApiService = useMemo(() => alertingApiProvider(mlHttpService), [mlHttpService]);

  const [jobConfigs, setJobConfigs] = useState<CombinedJobWithStats[]>([]);

  const onAlertParamChange = useCallback(
    <T extends keyof MlAnomalyDetectionAlertParams>(param: T) => (
      update: MlAnomalyDetectionAlertParams[T]
    ) => {
      setAlertParams(param, update);
    },
    []
  );

  const jobsAndGroupIds: string[] = useMemo(
    () => (Object.values(alertParams.jobSelection ?? {}) as string[][]).flat(),
    [alertParams.jobSelection]
  );

  /**
   * Extract alert related information based on the job selection
   */
  const fetchJobsConfig = useCallback(async () => {
    try {
      const jobs = await adJobsApiService.jobs(jobsAndGroupIds);
      setJobConfigs(jobs);
    } catch (e) {
      toasts.danger({
        title: i18n.translate('xpack.ml.anomalyDetectionAlert.errorFetchingJobs', {
          defaultMessage: 'Unable to fetch jobs configuration',
        }),
        body: e.message,
        toastLifeTimeMs: 5000,
      });
    }
  }, [jobsAndGroupIds]);

  const availableResultTypes = useMemo(() => {
    if (jobConfigs.length === 0) return Object.values(ANOMALY_RESULT_TYPE);

    return (jobConfigs ?? []).some((v) => v.analysis_config.influencers.length > 0)
      ? Object.values(ANOMALY_RESULT_TYPE)
      : [ANOMALY_RESULT_TYPE.BUCKET, ANOMALY_RESULT_TYPE.RECORD];
  }, [jobConfigs]);

  useEffect(
    function checkJobsConfiguration() {
      if (jobsAndGroupIds.length === 0) return;
      fetchJobsConfig();
    },
    [jobsAndGroupIds]
  );

  useMount(function setDefaults() {
    const { jobSelection, ...rest } = alertParams;
    if (Object.keys(rest).length === 0) {
      setAlertProperty('params', {
        // Set defaults
        severity: ANOMALY_THRESHOLD.CRITICAL,
        resultType: ANOMALY_RESULT_TYPE.BUCKET,
        includeInterim: false,
        // Preserve job selection
        jobSelection,
      });
    }
  });

  return (
    <EuiForm data-test-subj={'mlAnomalyAlertForm'}>
      <EuiFlexGroup gutterSize={'none'} justifyContent={'flexEnd'}>
        <EuiFlexItem grow={false}>
          <EuiBetaBadge
            label={i18n.translate('xpack.ml.anomalyDetectionAlert.betaBadgeLabel', {
              defaultMessage: 'Beta',
            })}
            tooltipContent={i18n.translate(
              'xpack.ml.anomalyDetectionAlert.betaBadgeTooltipContent',
              {
                defaultMessage: `Anomaly detection alerts are a beta feature. We'd love to hear your feedback.`,
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <JobSelectorControl
        jobsAndGroupIds={jobsAndGroupIds}
        adJobsApiService={adJobsApiService}
        onChange={useCallback(onAlertParamChange('jobSelection'), [])}
        errors={errors.jobSelection}
      />

      <ConfigValidator jobConfigs={jobConfigs} alertInterval={alertInterval} />

      <ResultTypeSelector
        value={alertParams.resultType}
        availableOption={availableResultTypes}
        onChange={useCallback(onAlertParamChange('resultType'), [])}
      />
      <SeverityControl
        value={alertParams.severity}
        onChange={useCallback(onAlertParamChange('severity'), [])}
      />
      <EuiSpacer size="m" />
      <InterimResultsControl
        value={alertParams.includeInterim}
        onChange={useCallback(onAlertParamChange('includeInterim'), [])}
      />
      <EuiSpacer size="m" />

      <PreviewAlertCondition alertingApiService={alertingApiService} alertParams={alertParams} />

      <EuiSpacer size="m" />
    </EuiForm>
  );
};

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default MlAnomalyAlertTrigger;
