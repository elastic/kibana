/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { EuiSpacer, EuiForm } from '@elastic/eui';
import useMount from 'react-use/lib/useMount';
import { i18n } from '@kbn/i18n';
import { JobSelectorControl } from './job_selector';
import { useMlKibana } from '../application/contexts/kibana';
import { jobsApiProvider } from '../application/services/ml_api_service/jobs';
import { HttpService } from '../application/services/http_service';
import { SeverityControl } from '../application/components/severity_control';
import { ResultTypeSelector } from './result_type_selector';
import { alertingApiProvider } from '../application/services/ml_api_service/alerting';
import { PreviewAlertCondition } from './preview_alert_condition';
import { ANOMALY_THRESHOLD } from '../../common';
import {
  MlAnomalyDetectionAlertAdvancedSettings,
  MlAnomalyDetectionAlertParams,
} from '../../common/types/alerts';
import { ANOMALY_RESULT_TYPE } from '../../common/constants/anomalies';
import { InterimResultsControl } from './interim_results_control';
import { ConfigValidator } from './config_validator';
import { CombinedJobWithStats } from '../../common/types/anomaly_detection_jobs';
import { AdvancedSettings } from './advanced_settings';
import { getLookbackInterval, getTopNBuckets } from '../../common/util/alerts';
import { isDefined } from '../../common/types/guards';
import { AlertTypeParamsExpressionProps } from '../../../triggers_actions_ui/public';
import { parseInterval } from '../../common/util/parse_interval';
import { BetaBadge } from './beta_badge';

export type MlAnomalyAlertTriggerProps =
  AlertTypeParamsExpressionProps<MlAnomalyDetectionAlertParams>;

const MlAnomalyAlertTrigger: FC<MlAnomalyAlertTriggerProps> = ({
  alertParams,
  setAlertParams,
  setAlertProperty,
  errors,
  alertInterval,
  alertNotifyWhen,
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
    <T extends keyof MlAnomalyDetectionAlertParams>(param: T) =>
      (update: MlAnomalyDetectionAlertParams[T]) => {
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
        lookbackInterval: undefined,
        topNBuckets: undefined,
      });
    }
  });

  const advancedSettings = useMemo(() => {
    let { lookbackInterval, topNBuckets } = alertParams;

    if (!isDefined(lookbackInterval) && jobConfigs.length > 0) {
      lookbackInterval = getLookbackInterval(jobConfigs);
    }
    if (!isDefined(topNBuckets) && jobConfigs.length > 0) {
      topNBuckets = getTopNBuckets(jobConfigs[0]);
    }
    return {
      lookbackInterval,
      topNBuckets,
    };
  }, [alertParams.lookbackInterval, alertParams.topNBuckets, jobConfigs]);

  const resultParams = useMemo(() => {
    return {
      ...alertParams,
      ...advancedSettings,
    };
  }, [alertParams, advancedSettings]);

  const maxNumberOfBuckets = useMemo(() => {
    if (jobConfigs.length === 0) return;

    const bucketDuration = parseInterval(jobConfigs[0].analysis_config.bucket_span);

    const lookbackIntervalDuration = advancedSettings.lookbackInterval
      ? parseInterval(advancedSettings.lookbackInterval)
      : null;

    if (lookbackIntervalDuration && bucketDuration) {
      return Math.ceil(lookbackIntervalDuration.asSeconds() / bucketDuration.asSeconds());
    }
  }, [jobConfigs, advancedSettings]);

  return (
    <EuiForm data-test-subj={'mlAnomalyAlertForm'}>
      <BetaBadge
        message={i18n.translate('xpack.ml.anomalyDetectionAlert.betaBadgeTooltipContent', {
          defaultMessage: `Anomaly detection alerts are a beta feature. We'd love to hear your feedback.`,
        })}
      />

      <JobSelectorControl
        jobsAndGroupIds={jobsAndGroupIds}
        adJobsApiService={adJobsApiService}
        onChange={useCallback(onAlertParamChange('jobSelection'), [])}
        errors={Array.isArray(errors.jobSelection) ? errors.jobSelection : []}
      />

      <ConfigValidator
        jobConfigs={jobConfigs}
        alertInterval={alertInterval}
        alertNotifyWhen={alertNotifyWhen}
        alertParams={resultParams}
        maxNumberOfBuckets={maxNumberOfBuckets}
      />

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

      <AdvancedSettings
        value={advancedSettings}
        onChange={useCallback((update) => {
          Object.keys(update).forEach((k) => {
            setAlertParams(k, update[k as keyof MlAnomalyDetectionAlertAdvancedSettings]);
          });
        }, [])}
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
