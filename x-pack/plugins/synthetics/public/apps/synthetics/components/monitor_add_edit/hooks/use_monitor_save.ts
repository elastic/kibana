/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FETCH_STATUS, useFetcher } from '@kbn/observability-plugin/public';
import { useParams, useRouteMatch } from 'react-router-dom';
import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { MONITOR_EDIT_ROUTE } from '../../../../../../common/constants';
import { SyntheticsMonitor } from '../../../../../../common/runtime_types';
import { createMonitorAPI, updateMonitorAPI } from '../../../state/monitor_management/api';
import { kibanaService } from '../../../../../utils/kibana_service';

export const useMonitorSave = ({ monitorData }: { monitorData?: SyntheticsMonitor }) => {
  const { monitorId } = useParams<{ monitorId: string }>();

  const editRouteMatch = useRouteMatch({ path: MONITOR_EDIT_ROUTE });
  const isEdit = editRouteMatch?.isExact;

  const { data, status, loading } = useFetcher(() => {
    if (monitorData) {
      if (isEdit) {
        return updateMonitorAPI({
          id: monitorId,
          monitor: monitorData,
        });
      } else {
        return createMonitorAPI({
          monitor: monitorData,
        });
      }
    }
  }, [monitorData]);

  useEffect(() => {
    if (status === FETCH_STATUS.FAILURE) {
      kibanaService.toasts.addDanger({
        title: MONITOR_FAILURE_LABEL,
        toastLifeTimeMs: 3000,
      });
    } else if (status === FETCH_STATUS.SUCCESS && !loading) {
      kibanaService.toasts.addSuccess({
        title: monitorId ? MONITOR_UPDATED_SUCCESS_LABEL : MONITOR_SUCCESS_LABEL,
        toastLifeTimeMs: 3000,
      });
    }
  }, [data, status, monitorId, loading]);

  return { status, loading, isEdit };
};

const MONITOR_SUCCESS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorAddedSuccessMessage',
  {
    defaultMessage: 'Monitor added successfully.',
  }
);

const MONITOR_UPDATED_SUCCESS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorEditedSuccessMessage',
  {
    defaultMessage: 'Monitor updated successfully.',
  }
);

const MONITOR_FAILURE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorFailureMessage',
  {
    defaultMessage: 'Monitor was unable to be saved. Please try again later.',
  }
);
