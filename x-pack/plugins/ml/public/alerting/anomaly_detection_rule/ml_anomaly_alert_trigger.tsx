/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiSpacer, EuiForm } from '@elastic/eui';
import useMount from 'react-use/lib/useMount';
import { i18n } from '@kbn/i18n';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { isDefined } from '@kbn/ml-is-defined';
import { ML_ANOMALY_RESULT_TYPE, ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { MlCapabilities } from '../../../common/types/capabilities';
import { ML_PAGES } from '../../../common/constants/locator';
import type { MlCoreSetup } from '../../plugin';
import { JobSelectorControl } from '../job_selector';
import { jobsApiProvider } from '../../application/services/ml_api_service/jobs';
import { HttpService } from '../../application/services/http_service';
import { useToastNotificationService } from '../../application/services/toast_notification_service';
import { SeverityControl } from '../../application/components/severity_control';
import { ResultTypeSelector } from './result_type_selector';
import { alertingApiProvider } from '../../application/services/ml_api_service/alerting';
import { PreviewAlertCondition } from './preview_alert_condition';
import type {
  MlAnomalyDetectionAlertAdvancedSettings,
  MlAnomalyDetectionAlertParams,
} from '../../../common/types/alerts';
import { InterimResultsControl } from './interim_results_control';
import { ConfigValidator } from './config_validator';
import { type CombinedJobWithStats } from '../../../common/types/anomaly_detection_jobs';
import { AdvancedSettings } from './advanced_settings';
import { getLookbackInterval, getTopNBuckets } from '../../../common/util/alerts';
import { parseInterval } from '../../../common/util/parse_interval';

export type MlAnomalyAlertTriggerProps =
  RuleTypeParamsExpressionProps<MlAnomalyDetectionAlertParams> & {
    getStartServices: MlCoreSetup['getStartServices'];
    mlCapabilities: MlCapabilities;
  };

const MlAnomalyAlertTrigger: FC<MlAnomalyAlertTriggerProps> = ({
  ruleParams,
  setRuleParams,
  setRuleProperty,
  errors,
  ruleInterval,
  alertNotifyWhen,
  getStartServices,
  mlCapabilities,
}) => {
  const {
    services: { http },
  } = useKibana();

  const [newJobUrl, setNewJobUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    if (!mlCapabilities.canCreateJob) return;

    getStartServices().then((startServices) => {
      const locator = startServices[2].locator;
      if (!locator) return;
      locator.getUrl({ page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB }).then((url) => {
        if (mounted) {
          setNewJobUrl(url);
        }
      });
    });

    return () => {
      mounted = false;
    };
  }, [getStartServices, mlCapabilities]);

  const mlHttpService = useMemo(() => new HttpService(http!), [http]);
  const adJobsApiService = useMemo(() => jobsApiProvider(mlHttpService), [mlHttpService]);
  const alertingApiService = useMemo(() => alertingApiProvider(mlHttpService), [mlHttpService]);
  const { displayErrorToast } = useToastNotificationService();

  const [jobConfigs, setJobConfigs] = useState<CombinedJobWithStats[]>([]);

  const onAlertParamChange = useCallback(
    <T extends keyof MlAnomalyDetectionAlertParams>(param: T) =>
      (update: MlAnomalyDetectionAlertParams[T]) => {
        setRuleParams(param, update);
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      displayErrorToast(
        e,
        i18n.translate('xpack.ml.anomalyDetectionAlert.errorFetchingJobs', {
          defaultMessage: 'Unable to fetch jobs configuration',
        }),
        5000
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsAndGroupIds]);

  const availableResultTypes = useMemo(() => {
    if (jobConfigs.length === 0) return Object.values(ML_ANOMALY_RESULT_TYPE);

    return (jobConfigs ?? []).some((v) => Boolean(v.analysis_config?.influencers?.length))
      ? Object.values(ML_ANOMALY_RESULT_TYPE)
      : [ML_ANOMALY_RESULT_TYPE.BUCKET, ML_ANOMALY_RESULT_TYPE.RECORD];
  }, [jobConfigs]);

  useEffect(
    function checkJobsConfiguration() {
      if (jobsAndGroupIds.length === 0) return;
      fetchJobsConfig();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobsAndGroupIds]
  );

  useMount(function setDefaults() {
    const { jobSelection, ...rest } = ruleParams;
    if (Object.keys(rest).length === 0) {
      setRuleProperty('params', {
        // Set defaults
        severity: ML_ANOMALY_THRESHOLD.CRITICAL,
        resultType: ML_ANOMALY_RESULT_TYPE.BUCKET,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleParams.lookbackInterval, ruleParams.topNBuckets, jobConfigs]);

  const resultParams = useMemo(() => {
    return {
      ...ruleParams,
      ...advancedSettings,
    };
  }, [ruleParams, advancedSettings]);

  const maxNumberOfBuckets = useMemo(() => {
    if (jobConfigs.length === 0) return;

    const bucketDuration = parseInterval(jobConfigs[0].analysis_config.bucket_span!);

    const lookbackIntervalDuration = advancedSettings.lookbackInterval
      ? parseInterval(advancedSettings.lookbackInterval)
      : null;

    if (lookbackIntervalDuration && bucketDuration) {
      return Math.ceil(lookbackIntervalDuration.asSeconds() / bucketDuration.asSeconds());
    }
  }, [jobConfigs, advancedSettings]);

  return (
    <EuiForm data-test-subj={'mlAnomalyAlertForm'}>
      <JobSelectorControl
        createJobUrl={newJobUrl}
        jobsAndGroupIds={jobsAndGroupIds}
        adJobsApiService={adJobsApiService}
        // eslint-disable-next-line react-hooks/exhaustive-deps
        onChange={useCallback(onAlertParamChange('jobSelection'), [])}
        errors={Array.isArray(errors.jobSelection) ? errors.jobSelection : []}
        shouldUseDropdownJobCreate
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
        onChange={useCallback(onAlertParamChange('resultType'), [])}
      />
      <SeverityControl
        value={ruleParams.severity}
        // eslint-disable-next-line react-hooks/exhaustive-deps
        onChange={useCallback(onAlertParamChange('severity'), [])}
      />
      <EuiSpacer size="m" />
      <InterimResultsControl
        value={ruleParams.includeInterim}
        // eslint-disable-next-line react-hooks/exhaustive-deps
        onChange={useCallback(onAlertParamChange('includeInterim'), [])}
      />
      <EuiSpacer size="m" />

      <AdvancedSettings
        value={advancedSettings}
        onChange={useCallback((update) => {
          Object.keys(update).forEach((k) => {
            setRuleParams(k, update[k as keyof MlAnomalyDetectionAlertAdvancedSettings]);
          });
          // eslint-disable-next-line react-hooks/exhaustive-deps
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
