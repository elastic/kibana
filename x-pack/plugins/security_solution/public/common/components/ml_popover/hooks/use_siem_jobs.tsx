/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { DEFAULT_INDEX_KEY } from '../../../../../common/constants';
import { checkRecognizer, getJobsSummary, getModules } from '../api';
import { SiemJob } from '../types';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { errorToToaster, useStateToaster } from '../../toasters';
import { useUiSetting$ } from '../../../lib/kibana';

import * as i18n from './translations';
import { createSiemJobs } from './use_siem_jobs_helpers';
import { useMlCapabilities } from './use_ml_capabilities';

type Return = [boolean, SiemJob[]];

/**
 * Compiles a collection of SiemJobs, which are a list of all jobs relevant to the SIEM App. This
 * includes all installed jobs in the `SIEM` ML group, and all jobs within ML Modules defined in
 * ml_module (whether installed or not). Use the corresponding helper functions to filter the job
 * list as necessary. E.g. installed jobs, running jobs, etc.
 *
 * @param refetchData
 */
export const useSiemJobs = (refetchData: boolean): Return => {
  const [siemJobs, setSiemJobs] = useState<SiemJob[]>([]);
  const [loading, setLoading] = useState(true);
  const mlCapabilities = useMlCapabilities();
  const userPermissions = hasMlUserPermissions(mlCapabilities);
  const [siemDefaultIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setLoading(true);

    async function fetchSiemJobIdsFromGroupsData() {
      if (userPermissions) {
        try {
          // Batch fetch all installed jobs, ML modules, and check which modules are compatible with siemDefaultIndex
          const [jobSummaryData, modulesData, compatibleModules] = await Promise.all([
            getJobsSummary(abortCtrl.signal),
            getModules({ signal: abortCtrl.signal }),
            checkRecognizer({
              indexPatternName: siemDefaultIndex,
              signal: abortCtrl.signal,
            }),
          ]);

          const compositeSiemJobs = createSiemJobs(jobSummaryData, modulesData, compatibleModules);

          if (isSubscribed) {
            setSiemJobs(compositeSiemJobs);
          }
        } catch (error) {
          if (isSubscribed) {
            errorToToaster({ title: i18n.SIEM_JOB_FETCH_FAILURE, error, dispatchToaster });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchData, userPermissions]);

  return [loading, siemJobs];
};
