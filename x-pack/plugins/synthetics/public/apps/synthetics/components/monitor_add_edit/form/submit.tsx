/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EuiButton, EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext } from 'react-hook-form';
import { useFetcher, FETCH_STATUS } from '@kbn/observability-plugin/public';
import { SyntheticsMonitor } from '../types';
import { format } from './formatter';
import { createMonitorAPI } from '../../../state/monitor_management/api';
import { kibanaService } from '../../../../../utils/kibana_service';

export const ActionBar: React.FC = ({ children }) => {
  const { monitorId } = useParams<{ monitorId: string }>();
  const { handleSubmit } = useFormContext();

  const [monitorData, setMonitorData] = useState<SyntheticsMonitor | undefined>(undefined);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean | undefined>(undefined);

  const { data, status, error } = useFetcher(() => {
    if (monitorData) {
      return createMonitorAPI({
        monitor: monitorData,
      });
    }
  }, [monitorData]);

  const hasErrors = data && 'attributes' in data && data.attributes.errors?.length > 0;
  const loading = status === FETCH_STATUS.LOADING;

  useEffect(() => {
    if (status === FETCH_STATUS.FAILURE) {
      kibanaService.toasts.addDanger({
        title: MONITOR_FAILURE_LABEL,
        toastLifeTimeMs: 3000,
      });
    } else if (status === FETCH_STATUS.SUCCESS && !hasErrors && !loading) {
      kibanaService.toasts.addSuccess({
        title: monitorId ? MONITOR_UPDATED_SUCCESS_LABEL : MONITOR_SUCCESS_LABEL,
        toastLifeTimeMs: 3000,
      });
      setIsSuccessful(true);
    } else if (hasErrors && !loading) {
      //   showSyncErrors(data.attributes.errors, locations);
      setIsSuccessful(true);
    }
  }, [data, status, monitorId, hasErrors, loading]);

  const formSubmitter = (formData: Record<string, any>) => {
    setMonitorData(format(formData) as SyntheticsMonitor);
  };

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiLink href="#">{CANCEL_LABEL}</EuiLink>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton iconType="beaker">Test now</EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill iconType="plusInCircleFilled" onClick={handleSubmit(formSubmitter)}>
              Create monitor
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

const SAVE_MONITOR_LABEL = i18n.translate('xpack.synthetics.monitorManagement.saveMonitorLabel', {
  defaultMessage: 'Save monitor',
});

const UPDATE_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.updateMonitorLabel',
  {
    defaultMessage: 'Update monitor',
  }
);

const RUN_TEST_LABEL = i18n.translate('xpack.synthetics.monitorManagement.runTest', {
  defaultMessage: 'Run test',
});

const RE_RUN_TEST_LABEL = i18n.translate('xpack.synthetics.monitorManagement.reRunTest', {
  defaultMessage: 'Re-run test',
});

const VALIDATION_ERROR_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.validationError',
  {
    defaultMessage: 'Your monitor has errors. Please fix them before saving.',
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

const TEST_NOW_DESCRIPTION = i18n.translate('xpack.synthetics.testRun.description', {
  defaultMessage: 'Test your monitor and verify the results before saving',
});
