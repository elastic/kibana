/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { DEFAULT_INDEX_KEY } from '../../../../../common/constants';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useUiSetting$, useHttp } from '../../../lib/kibana';
import { checkRecognizer, getModules } from '../api';
import { SiemJob } from '../types';
import { createSiemJobs } from './use_siem_jobs_helpers';
import { useMlCapabilities } from './use_ml_capabilities';
import * as i18n from '../../ml/translations';
import { getJobsSummary } from '../../ml/api/get_jobs_summary';

export interface UseSecurityJobsReturn {
  loading: boolean;
  jobs: SiemJob[];
  isMlAdmin: boolean;
  isLicensed: boolean;
}

/**
 * Compiles a collection of SecurityJobs, which are a list of all jobs relevant to the Security Solution App. This
 * includes all installed jobs in the `Security` ML group, and all jobs within ML Modules defined in
 * ml_module (whether installed or not). Use the corresponding helper functions to filter the job
 * list as necessary. E.g. installed jobs, running jobs, etc.
 *
 * NOTE: If the user is not an ml admin, jobs will be empty and isMlAdmin will be false.
 *
 * @param refetchData
 */
export const useSecurityJobs = (refetchData: boolean): UseSecurityJobsReturn => {
  const [jobs, setJobs] = useState<SiemJob[]>([]);
  const [loading, setLoading] = useState(true);
  const mlCapabilities = useMlCapabilities();
  const [siemDefaultIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const http = useHttp();
  const { addError } = useAppToasts();

  const isMlAdmin = hasMlAdminPermissions(mlCapabilities);
  const isLicensed = mlCapabilities.isPlatinumOrTrialLicense;

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setLoading(true);

    async function fetchSiemJobIdsFromGroupsData() {
      if (isMlAdmin) {
        try {
          // Batch fetch all installed jobs, ML modules, and check which modules are compatible with siemDefaultIndex
          const [jobSummaryData, modulesData, compatibleModules] = await Promise.all([
            getJobsSummary({ http, signal: abortCtrl.signal }),
            getModules({ signal: abortCtrl.signal }),
            checkRecognizer({
              indexPatternName: siemDefaultIndex,
              signal: abortCtrl.signal,
            }),
          ]);

          const compositeSiemJobs = createSiemJobs(jobSummaryData, modulesData, compatibleModules);

          if (isSubscribed) {
            setJobs(compositeSiemJobs);
          }
        } catch (error) {
          if (isSubscribed) {
            addError(error, { title: i18n.SIEM_JOB_FETCH_FAILURE });
          }
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }

    fetchSiemJobIdsFromGroupsData();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [refetchData, isMlAdmin, siemDefaultIndex, addError, http]);

  return { isLicensed, isMlAdmin, jobs, loading };
};
