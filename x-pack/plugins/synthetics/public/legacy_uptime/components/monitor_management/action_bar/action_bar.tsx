/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useState, useEffect, useRef } from 'react';
import { useParams, Redirect } from 'react-router-dom';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiPopover,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useSelector } from 'react-redux';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-plugin/public';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { showSyncErrors } from '../../../../apps/synthetics/components/monitors_page/management/show_sync_errors';
import { MONITOR_MANAGEMENT_ROUTE } from '../../../../../common/constants';
import { UptimeSettingsContext } from '../../../contexts';
import { setMonitor } from '../../../state/api';

import {
  ConfigKey,
  SyntheticsMonitor,
  SourceType,
  ServiceLocationErrors,
} from '../../../../../common/runtime_types';
import { TestRun } from '../test_now_mode/test_now_mode';

import { monitorManagementListSelector } from '../../../state/selectors';

import { kibanaService } from '../../../state/kibana_service';

import {
  PRIVATE_AVAILABLE_LABEL,
  TEST_SCHEDULED_LABEL,
} from '../../overview/monitor_list/translations';

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
  const mouseMoveTimeoutIds = useRef<[number, number]>([0, 0]);
  const isReadOnly = monitor[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT;

  const isAnyPublicLocationSelected = monitor.locations?.some((loc) => loc.isServiceManaged);
  const isOnlyPrivateLocations =
    !locations.some((loc) => loc.isServiceManaged) ||
    ((monitor.locations?.length ?? 0) > 0 && !isAnyPublicLocationSelected);

  const { data, status } = useFetcher(() => {
    if (!isSaving || !isValid) {
      return;
    }
    return setMonitor({
      monitor,
      id: monitorId,
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
      showSyncErrors(
        (data as { attributes: { errors: ServiceLocationErrors } })?.attributes.errors ?? [],
        locations,
        kibanaService.toasts
      );
      setIsSuccessful(true);
    }
  }, [data, status, isSaving, isValid, monitorId, hasErrors, locations, loading]);

  return isSuccessful ? (
    <Redirect to={MONITOR_MANAGEMENT_ROUTE + '/all'} />
  ) : (
    <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          color="ghost"
          size="s"
          href={`${basePath}/app/uptime/${MONITOR_MANAGEMENT_ROUTE}/all`}
        >
          {DISCARD_LABEL}
        </EuiButtonEmpty>
      </EuiFlexItem>
      {!isReadOnly ? (
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
            <EuiFlexItem grow={false}>
              <WarningText>{!isValid && hasBeenSubmitted && VALIDATION_ERROR_LABEL}</WarningText>
            </EuiFlexItem>

            {onTestNow && (
              <EuiFlexItem grow={false}>
                {/* Popover is used instead of EuiTooltip until the resolution of https://github.com/elastic/eui/issues/5604 */}
                <EuiOutsideClickDetector
                  onOutsideClick={() => {
                    setIsPopoverOpen(false);
                  }}
                >
                  <EuiPopover
                    repositionOnScroll={true}
                    ownFocus={false}
                    initialFocus={''}
                    button={
                      <EuiButton
                        css={{ width: '100%' }}
                        fill
                        size="s"
                        color="success"
                        iconType="play"
                        disabled={!isValid || isTestRunInProgress || !isAnyPublicLocationSelected}
                        data-test-subj={'monitorTestNowRunBtn'}
                        onClick={() => onTestNow()}
                        onMouseOver={() => {
                          // We need this custom logic to display a popover even when button is disabled.
                          clearTimeout(mouseMoveTimeoutIds.current[1]);
                          if (mouseMoveTimeoutIds.current[0] === 0) {
                            mouseMoveTimeoutIds.current[0] = setTimeout(() => {
                              clearTimeout(mouseMoveTimeoutIds.current[1]);
                              setIsPopoverOpen(true);
                            }, 250) as unknown as number;
                          }
                        }}
                        onMouseOut={() => {
                          // We need this custom logic to display a popover even when button is disabled.
                          clearTimeout(mouseMoveTimeoutIds.current[1]);
                          mouseMoveTimeoutIds.current[1] = setTimeout(() => {
                            clearTimeout(mouseMoveTimeoutIds.current[0]);
                            setIsPopoverOpen(false);
                            mouseMoveTimeoutIds.current = [0, 0];
                          }, 100) as unknown as number;
                        }}
                      >
                        {testRun ? RE_RUN_TEST_LABEL : RUN_TEST_LABEL}
                      </EuiButton>
                    }
                    isOpen={isPopoverOpen}
                  >
                    <EuiText style={{ width: 260, outline: 'none' }}>
                      <p>
                        {isTestRunInProgress
                          ? TEST_SCHEDULED_LABEL
                          : isOnlyPrivateLocations || (isValid && !isAnyPublicLocationSelected)
                          ? PRIVATE_AVAILABLE_LABEL
                          : TEST_NOW_DESCRIPTION}
                      </p>
                    </EuiText>
                  </EuiPopover>
                </EuiOutsideClickDetector>
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
      ) : null}
    </EuiFlexGroup>
  );
};

const WarningText = euiStyled(EuiText)`
    box-shadow: -4px 0 ${(props) => props.theme.eui.euiColorWarning};
    padding-left: 8px;
`;

const DISCARD_LABEL = i18n.translate('xpack.synthetics.monitorManagement.discardLabel', {
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
