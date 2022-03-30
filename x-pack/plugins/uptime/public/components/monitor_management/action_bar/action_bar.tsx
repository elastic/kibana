/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useState, useEffect } from 'react';
import { useParams, Redirect } from 'react-router-dom';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useSelector } from 'react-redux';
import { FETCH_STATUS, useFetcher } from '../../../../../observability/public';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';

import { MONITOR_MANAGEMENT_ROUTE } from '../../../../common/constants';
import { UptimeSettingsContext } from '../../../contexts';
import { setMonitor } from '../../../state/api';

import { SyntheticsMonitor } from '../../../../common/runtime_types';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { TestRun } from '../test_now_mode/test_now_mode';

import { monitorManagementListSelector } from '../../../state/selectors';

import { kibanaService } from '../../../state/kibana_service';

export interface ActionBarProps {
  monitor: SyntheticsMonitor;
  isValid: boolean;
  testRun?: TestRun;
  isTestRunInProgress: boolean;
  onSave?: () => void;
  onTestNow?: () => void;
}

export const ActionBar = ({
  monitor,
  isValid,
  onSave,
  onTestNow,
  testRun,
  isTestRunInProgress,
}: ActionBarProps) => {
  const { monitorId } = useParams<{ monitorId: string }>();
  const { basePath } = useContext(UptimeSettingsContext);
  const { locations } = useSelector(monitorManagementListSelector);

  const [hasBeenSubmitted, setHasBeenSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean | undefined>(undefined);

  const { data, status } = useFetcher(() => {
    if (!isSaving || !isValid) {
      return;
    }
    return setMonitor({
      monitor,
      id: monitorId ? Buffer.from(monitorId, 'base64').toString('utf8') : undefined,
    });
  }, [monitor, monitorId, isValid, isSaving]);

  const hasErrors = data && 'attributes' in data && data.attributes.errors?.length > 0;
  const loading = status === FETCH_STATUS.LOADING;

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
      Object.values(data.attributes.errors!).forEach((location) => {
        const { status: responseStatus, reason } = location.error || {};
        kibanaService.toasts.addWarning({
          title: i18n.translate('xpack.uptime.monitorManagement.service.error.title', {
            defaultMessage: `Unable to sync monitor config`,
          }),
          text: toMountPoint(
            <>
              <p>
                {i18n.translate('xpack.uptime.monitorManagement.service.error.message', {
                  defaultMessage: `Your monitor was saved, but there was a problem syncing the configuration for {location}. We will automatically try again later. If this problem continues, your monitors will stop running in {location}. Please contact Support for assistance.`,
                  values: {
                    location: locations?.find((loc) => loc?.id === location.locationId)?.label,
                  },
                })}
              </p>
              {responseStatus || reason ? (
                <p>
                  {responseStatus
                    ? i18n.translate('xpack.uptime.monitorManagement.service.error.status', {
                        defaultMessage: 'Status: {status}. ',
                        values: { status: responseStatus },
                      })
                    : null}
                  {reason
                    ? i18n.translate('xpack.uptime.monitorManagement.service.error.reason', {
                        defaultMessage: 'Reason: {reason}.',
                        values: { reason },
                      })
                    : null}
                </p>
              ) : null}
            </>
          ),
          toastLifeTimeMs: 30000,
        });
      });
      setIsSuccessful(true);
    }
  }, [data, status, isSaving, isValid, monitorId, hasErrors, locations, loading]);

  return isSuccessful ? (
    <Redirect to={MONITOR_MANAGEMENT_ROUTE + '/all'} />
  ) : (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem>
        <WarningText>{!isValid && hasBeenSubmitted && VALIDATION_ERROR_LABEL}</WarningText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="ghost"
              size="s"
              href={`${basePath}/app/uptime/${MONITOR_MANAGEMENT_ROUTE}`}
            >
              {DISCARD_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>

          {onTestNow && (
            <EuiFlexItem grow={false}>
              {/* Popover is used instead of EuiTooltip until the resolution of https://github.com/elastic/eui/issues/5604 */}
              <EuiPopover
                repositionOnScroll={true}
                initialFocus={false}
                button={
                  <EuiButton
                    css={{ width: '100%' }}
                    fill
                    size="s"
                    color="success"
                    iconType="play"
                    disabled={!isValid || isTestRunInProgress}
                    data-test-subj={'monitorTestNowRunBtn'}
                    onClick={() => onTestNow()}
                    onMouseEnter={() => {
                      setIsPopoverOpen(true);
                    }}
                    onMouseLeave={() => {
                      setIsPopoverOpen(false);
                    }}
                  >
                    {testRun ? RE_RUN_TEST_LABEL : RUN_TEST_LABEL}
                  </EuiButton>
                }
                isOpen={isPopoverOpen}
              >
                <EuiText style={{ width: 260, outline: 'none' }}>
                  <p>{TEST_NOW_DESCRIPTION}</p>
                </EuiText>
              </EuiPopover>
            </EuiFlexItem>
          )}

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
              {monitorId ? UPDATE_MONITOR_LABEL : SAVE_MONITOR_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const WarningText = euiStyled(EuiText)`
    box-shadow: -4px 0 ${(props) => props.theme.eui.euiColorWarning};
    padding-left: 8px;
`;

const DISCARD_LABEL = i18n.translate('xpack.uptime.monitorManagement.discardLabel', {
  defaultMessage: 'Discard',
});

const SAVE_MONITOR_LABEL = i18n.translate('xpack.uptime.monitorManagement.saveMonitorLabel', {
  defaultMessage: 'Save monitor',
});

const UPDATE_MONITOR_LABEL = i18n.translate('xpack.uptime.monitorManagement.updateMonitorLabel', {
  defaultMessage: 'Update monitor',
});

const RUN_TEST_LABEL = i18n.translate('xpack.uptime.monitorManagement.runTest', {
  defaultMessage: 'Run test',
});

const RE_RUN_TEST_LABEL = i18n.translate('xpack.uptime.monitorManagement.reRunTest', {
  defaultMessage: 'Re-run test',
});

const VALIDATION_ERROR_LABEL = i18n.translate('xpack.uptime.monitorManagement.validationError', {
  defaultMessage: 'Your monitor has errors. Please fix them before saving.',
});

const MONITOR_SUCCESS_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.monitorAddedSuccessMessage',
  {
    defaultMessage: 'Monitor added successfully.',
  }
);

const MONITOR_UPDATED_SUCCESS_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.monitorEditedSuccessMessage',
  {
    defaultMessage: 'Monitor updated successfully.',
  }
);

const MONITOR_FAILURE_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.monitorFailureMessage',
  {
    defaultMessage: 'Monitor was unable to be saved. Please try again later.',
  }
);

const TEST_NOW_DESCRIPTION = i18n.translate('xpack.uptime.testRun.description', {
  defaultMessage: 'Test your monitor and verify the results before saving',
});
