/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useState, useEffect, useCallback } from 'react';
import { useLogViewContext } from '@kbn/logs-shared-plugin/public';
import { IdFormatByJobType, JobType } from '../../../../common/http_api/latest';
import { useActiveKibanaSpace } from '../../../hooks/use_kibana_space';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';

import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { callGetLogAnalysisIdFormats } from './call_get_log_analysis_id_formats';

const useLogMlJobIdFormatsShim = () => {
  const [idFormats, setIdFormats] = useState<IdFormatByJobType | null>(null);

  const { logViewReference } = useLogViewContext();
  const { space } = useActiveKibanaSpace();
  const { services } = useKibanaContextForPlugin();

  const [getLogAnalysisIdFormatsRequest, getLogAnalysisIdFormats] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        if (!space) {
          return { data: null };
        }

        if (logViewReference.type === 'log-view-inline') {
          throw new Error('Logs ML features only support persisted Log Views');
        }

        return await callGetLogAnalysisIdFormats(
          {
            logViewId: logViewReference.logViewId,
            spaceId: space.id,
          },
          services.http.fetch
        );
      },
      onResolve: ({ data }) => {
        setIdFormats(data);
      },
    },
    [logViewReference, space]
  );

  useEffect(() => {
    getLogAnalysisIdFormats();
  }, [getLogAnalysisIdFormats]);

  const isLoadingLogAnalysisIdFormats = getLogAnalysisIdFormatsRequest.state === 'pending';
  const hasFailedLoadingLogAnalysisIdFormats = getLogAnalysisIdFormatsRequest.state === 'rejected';

  const migrateIdFormat = useCallback((jobType: JobType) => {
    setIdFormats((previousValue) => {
      if (!previousValue) {
        return null;
      }

      return {
        ...previousValue,
        [jobType]: 'hashed',
      };
    });
  }, []);

  return {
    idFormats,
    migrateIdFormat,
    isLoadingLogAnalysisIdFormats,
    hasFailedLoadingLogAnalysisIdFormats,
  };
};

export const [LogMlJobIdFormatsShimProvider, useLogMlJobIdFormatsShimContext] =
  createContainer(useLogMlJobIdFormatsShim);
