/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { EuiBottomBar, EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FETCH_STATUS, useFetcher } from '../../../../../observability/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

import { setMonitor } from '../../../state/api';

import { Monitor } from '../../fleet_package/types';

interface Props {
  id?: string;
  monitor: Monitor;
  isValid: boolean;
  onSave?: () => void;
}

export const ActionBar = ({ id, monitor, isValid, onSave }: Props) => {
  const [hasBeenSubmitted, setHasBeenSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { notifications } = useKibana();

  const { data, status } = useFetcher(() => {
    if (!isSaving || !isValid) {
      return;
    }
    return setMonitor({ monitor, id });
  }, [monitor, id, isValid, isSaving]);

  const handleOnSave = useCallback(() => {
    if (onSave) {
      onSave();
    }
    setIsSaving(true);
    setHasBeenSubmitted(true);
  }, [onSave]);

  useEffect(() => {
    if (!isSaving) {
      return;
    }
    if (!isValid) {
      setIsSaving(false);
      return;
    }
    if (status === FETCH_STATUS.FAILURE || status === FETCH_STATUS.SUCCESS) {
      setIsSaving(false);
    }
    if (status === FETCH_STATUS.FAILURE) {
      notifications.toasts.danger({
        title: <p data-test-subj="uptimeAddMonitorFailure">{MONITOR_FAILURE_LABEL}</p>,
        toastLifeTimeMs: 3000,
      });
    } else if (status === FETCH_STATUS.SUCCESS) {
      notifications.toasts.success({
        title: <p data-test-subj="uptimeAddMonitorSuccess">{MONITOR_SUCCESS_LABEL}</p>,
        toastLifeTimeMs: 3000,
      });
    }
  }, [data, status, notifications.toasts, isSaving, isValid]);

  return (
    <EuiBottomBar>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>{!isValid && hasBeenSubmitted && VALIDATION_ERROR_LABEL}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty color="ghost" size="s" iconType="cross">
                {DISCARD_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                color="primary"
                fill
                size="s"
                iconType="check"
                onClick={handleOnSave}
                isLoading={isSaving}
                disabled={hasBeenSubmitted && !isValid}
              >
                {id ? EDIT_MONITOR_LABEL : SAVE_MONITOR_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBottomBar>
  );
};

const DISCARD_LABEL = i18n.translate('xpack.uptime.monitorManagement.discardLabel', {
  defaultMessage: 'Discard',
});

const SAVE_MONITOR_LABEL = i18n.translate('xpack.uptime.monitorManagement.saveMonitorLabel', {
  defaultMessage: 'Save monitor',
});

const EDIT_MONITOR_LABEL = i18n.translate('xpack.uptime.monitorManagement.editMonitorLabel', {
  defaultMessage: 'Edit monitor',
});

const VALIDATION_ERROR_LABEL = i18n.translate('xpack.uptime.monitorManagement.validationError', {
  defaultMessage: 'Your monitor has errors. Please fix them before saving.',
});

const MONITOR_SUCCESS_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.monitorSuccessMessage',
  {
    defaultMessage: 'Monitor added successfully.',
  }
);

// TODO: Discuss error states with product
const MONITOR_FAILURE_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.monitorFailureMessage',
  {
    defaultMessage: 'Monitor was unable to be saved. Please try again later.',
  }
);
