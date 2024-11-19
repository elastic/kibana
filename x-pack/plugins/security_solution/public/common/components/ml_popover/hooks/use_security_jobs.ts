/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { DEFAULT_INDEX_KEY } from '../../../../../common/constants';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useUiSetting$ } from '../../../lib/kibana';
import type { inputsModel } from '../../../store';
import { useFetchJobsSummaryQuery } from '../../ml/hooks/use_fetch_jobs_summary_query';
import { useMlCapabilities } from '../../ml/hooks/use_ml_capabilities';
import * as i18n from '../../ml/translations';
import type { SecurityJob } from '../types';
import { useFetchModulesQuery } from './use_fetch_modules_query';
import { useFetchRecognizerQuery } from './use_fetch_recognizer_query';
import { createSecurityJobs } from './use_security_jobs_helpers';

export interface UseSecurityJobsReturn {
  loading: boolean;
  jobs: SecurityJob[];
  isMlAdmin: boolean;
  isLicensed: boolean;
  refetch: inputsModel.Refetch;
}

/**
 * Compiles a collection of SecurityJobs, which are a list of all jobs relevant to the Security Solution App. This
 * includes all installed jobs in the `Security` ML group, and all jobs within ML Modules defined in
 * ml_module (whether installed or not). Use the corresponding helper functions to filter the job
 * list as necessary. E.g. installed jobs, running jobs, etc.
 *
 * NOTE: If the user is not an ml admin, jobs will be empty and isMlAdmin will be false.
 * If you only need installed jobs, try the {@link useInstalledSecurityJobs} hook.
 *
 */
export const useSecurityJobs = (): UseSecurityJobsReturn => {
  const mlCapabilities = useMlCapabilities();
  const [securitySolutionDefaultIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const { addError } = useAppToasts();
  const isMlAdmin = hasMlAdminPermissions(mlCapabilities);
  const isLicensed = hasMlLicense(mlCapabilities);
  const isMlEnabled = isMlAdmin && isLicensed;

  const onError = useCallback(
    (error: unknown) => {
      addError(error, { title: i18n.SIEM_JOB_FETCH_FAILURE });
    },
    [addError]
  );

  const {
    data: jobSummaryData,
    isFetching: isJobSummaryFetching,
    refetch: refetchJobsSummary,
  } = useFetchJobsSummaryQuery({}, { enabled: isMlEnabled, onError });

  const {
    data: modulesData,
    isFetching: isModulesFetching,
    refetch: refetchModules,
  } = useFetchModulesQuery({}, { enabled: isMlEnabled, onError });

  const {
    data: compatibleModules,
    isFetching: isRecognizerFetching,
    refetch: refetchRecognizer,
  } = useFetchRecognizerQuery(
    { indexPatternName: securitySolutionDefaultIndex },
    { enabled: isMlEnabled, onError }
  );

  const refetch = useCallback(() => {
    refetchJobsSummary();
    refetchModules();
    refetchRecognizer();
  }, [refetchJobsSummary, refetchModules, refetchRecognizer]);

  const jobs = useMemo(() => {
    if (jobSummaryData && modulesData && compatibleModules) {
      return createSecurityJobs(jobSummaryData, modulesData, compatibleModules);
    }
    return [];
  }, [compatibleModules, jobSummaryData, modulesData]);

  return {
    isLicensed,
    isMlAdmin,
    jobs,
    loading: isJobSummaryFetching || isModulesFetching || isRecognizerFetching,
    refetch,
  };
};
