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
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
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
import { parseInterval } from '../../common/util/parse_interval';
import { BetaBadge } from './beta_badge';

export type MlAnomalyAlertTriggerProps =
  RuleTypeParamsExpressionProps<MlAnomalyDetectionAlertParams>;

const MlAnomalyAlertTrigger: FC<MlAnomalyAlertTriggerProps> = ({
  ruleParams,
  setRuleParams,
  setRuleProperty,
  errors,
  ruleInterval,
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
        setRuleParams(param, update);
      },
    []
  );

  const jobsAndGroupIds: string[] = useMemo(
    () => (Object.values(ruleParams.jobSelection ?? {}) as string[][]).flat(),
    [ruleParams.jobSelection]
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

    return (jobConfigs ?? []).some((v) => Boolean(v.analysis_config?.influencers?.length))
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
    const { jobSelection, ...rest } = ruleParams;
    if (Object.keys(rest).length === 0) {
      setRuleProperty('params', {
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
    let { lookbackInterval, topNBuckets } = ruleParams;

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
  }, [ruleParams.lookbackInterval, ruleParams.topNBuckets, jobConfigs]);

  const resultParams = useMemo(() => {
    return {
      ...ruleParams,
      ...advancedSettings,
    };
  }, [ruleParams, advancedSettings]);

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
        alertInterval={ruleInterval}
        alertNotifyWhen={alertNotifyWhen}
        alertParams={resultParams}
        maxNumberOfBuckets={maxNumberOfBuckets}
      />

      <ResultTypeSelector
        value={ruleParams.resultType}
        availableOption={availableResultTypes}
        onChange={useCallback(onAlertParamChange('resultType'), [])}
      />
      <SeverityControl
        value={ruleParams.severity}
        onChange={useCallback(onAlertParamChange('severity'), [])}
      />
      <EuiSpacer size="m" />
      <InterimResultsControl
        value={ruleParams.includeInterim}
        onChange={useCallback(onAlertParamChange('includeInterim'), [])}
      />
      <EuiSpacer size="m" />

      <AdvancedSettings
        value={advancedSettings}
        onChange={useCallback((update) => {
          Object.keys(update).forEach((k) => {
            setRuleParams(k, update[k as keyof MlAnomalyDetectionAlertAdvancedSettings]);
          });
        }, [])}
      />

      <EuiSpacer size="m" />

      <PreviewAlertCondition alertingApiService={alertingApiService} alertParams={ruleParams} />

      <EuiSpacer size="m" />
    </EuiForm>
  );
};

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default MlAnomalyAlertTrigger;
