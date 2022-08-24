/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Redirect, useParams, useHistory, useRouteMatch } from 'react-router-dom';
import { EuiButton, EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext } from 'react-hook-form';
import { useFetcher, FETCH_STATUS } from '@kbn/observability-plugin/public';
import { SyntheticsMonitor } from '../types';
import { format } from './formatter';
import { createMonitorAPI, updateMonitorAPI } from '../../../state/monitor_management/api';
import { kibanaService } from '../../../../../utils/kibana_service';

import { MONITORS_ROUTE, MONITOR_EDIT_ROUTE } from '../../../../../../common/constants';

export const ActionBar = () => {
  const { monitorId } = useParams<{ monitorId: string }>();
  const history = useHistory();
  const editRouteMatch = useRouteMatch({ path: MONITOR_EDIT_ROUTE });
  const isEdit = editRouteMatch?.isExact;
  const { handleSubmit } = useFormContext();

  const [monitorData, setMonitorData] = useState<SyntheticsMonitor | undefined>(undefined);

  const { data, status } = useFetcher(() => {
    if (!monitorData) {
      return null;
    }
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
  }, [monitorData]);

  const loading = status === FETCH_STATUS.LOADING;

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

  const formSubmitter = (formData: Record<string, any>) => {
    setMonitorData(format(formData) as SyntheticsMonitor);
  };

  return status === FETCH_STATUS.SUCCESS ? (
    <Redirect to={MONITORS_ROUTE} />
  ) : (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiLink href={history.createHref({ pathname: MONITORS_ROUTE })}>{CANCEL_LABEL}</EuiLink>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="plusInCircleFilled"
              onClick={handleSubmit(formSubmitter)}
              data-test-subj="syntheticsMonitorConfigSubmitButton"
            >
              {isEdit ? UPDATE_MONITOR_LABEL : CREATE_MONITOR_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const CANCEL_LABEL = i18n.translate('xpack.synthetics.monitorManagement.discardLabel', {
  defaultMessage: 'Cancel',
});

const CREATE_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.addEdit.createMonitorLabel',
  {
    defaultMessage: 'Create monitor',
  }
);

const UPDATE_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.updateMonitorLabel',
  {
    defaultMessage: 'Update monitor',
  }
);

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
