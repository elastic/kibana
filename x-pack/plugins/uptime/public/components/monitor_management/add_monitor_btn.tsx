/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiSwitch, EuiFlexItem, EuiFlexGroup, EuiToolTip } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { MONITOR_ADD_ROUTE } from '../../../common/constants';
import { getSyntheticsEnablement, disableSynthetics, enableSynthetics } from '../../state/actions';
import { monitorManagementListSelector } from '../../state/selectors';

import { kibanaService } from '../../state/kibana_service';

export const AddMonitorBtn = ({ isDisabled }: { isDisabled: boolean }) => {
  const history = useHistory();
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const dispatch = useDispatch();

  const {
    loading: { enablement: loading },
    error: { enablement: error },
    enablement,
  } = useSelector(monitorManagementListSelector);

  const { canEnable, isEnabled, areApiKeysEnabled } = enablement || {};

  useEffect(() => {
    if (!enablement) {
      dispatch(getSyntheticsEnablement());
    }
  }, [dispatch, enablement]);

  useEffect(() => {
    if (isEnabling && isEnabled) {
      setIsEnabling(false);
      kibanaService.toasts.addSuccess({
        title: SYNTHETICS_ENABLE_SUCCESS,
        toastLifeTimeMs: 3000,
      });
    } else if (isDisabling && !isEnabled) {
      setIsDisabling(false);
      kibanaService.toasts.addSuccess({
        title: SYNTHETICS_DISABLE_SUCCESS,
        toastLifeTimeMs: 3000,
      });
    } else if (isEnabling && error) {
      setIsEnabling(false);
      kibanaService.toasts.addDanger({
        title: SYNTHETICS_ENABLE_FAILURE,
        toastLifeTimeMs: 3000,
      });
    } else if (isDisabling && error) {
      kibanaService.toasts.addDanger({
        title: SYNTHETICS_DISABLE_FAILURE,
        toastLifeTimeMs: 3000,
      });
    }
  }, [isEnabled, isEnabling, isDisabling, error]);

  const handleSwitch = () => {
    if (isEnabled) {
      setIsDisabling(true);
      dispatch(disableSynthetics());
    } else {
      setIsEnabling(true);
      dispatch(enableSynthetics());
    }
  };

  const getSwitchToolTipContent = () => {
    if (!isEnabled) {
      return SYNTHETICS_ENABLE_TOOL_TIP_MESSAGE;
    } else if (!areApiKeysEnabled) {
      return API_KEYS_DISABLED_TOOL_TIP_MESSAGE;
    } else {
      return '';
    }
  };

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem
        style={{ alignItems: 'flex-end' }}
        grow={false}
        data-test-subj="addMonitorButton"
      >
        {canEnable && (
          <EuiToolTip content={getSwitchToolTipContent()}>
            <EuiSwitch
              checked={Boolean(isEnabled)}
              label={SYNTHETICS_ENABLE_LABEL}
              disabled={loading || !areApiKeysEnabled}
              onChange={() => handleSwitch()}
              data-test-subj="syntheticsEnableSwitch"
            />
          </EuiToolTip>
        )}
      </EuiFlexItem>
      <EuiFlexItem
        style={{ alignItems: 'flex-end' }}
        grow={false}
        data-test-subj="addMonitorButton"
      >
        <EuiToolTip content={isEnabled ? '' : SYNTHETICS_DISABLED_MESSAGE}>
          <EuiButton
            isLoading={loading}
            fill
            isDisabled={isDisabled || !isEnabled}
            iconType="plus"
            data-test-subj="addMonitorBtn"
            href={history.createHref({
              pathname: MONITOR_ADD_ROUTE,
            })}
          >
            {ADD_MONITOR_LABEL}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const ADD_MONITOR_LABEL = i18n.translate('xpack.uptime.monitorManagement.addMonitorLabel', {
  defaultMessage: 'Add monitor',
});

const SYNTHETICS_ENABLE_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.syntheticsEnableLabel',
  {
    defaultMessage: 'Enable',
  }
);

const SYNTHETICS_ENABLE_FAILURE = i18n.translate(
  'xpack.uptime.monitorManagement.syntheticsEnabledFailure',
  {
    defaultMessage: 'Monitor Management was not able to be enabled. Please contact support.',
  }
);

const SYNTHETICS_DISABLE_FAILURE = i18n.translate(
  'xpack.uptime.monitorManagement.syntheticsDisabled',
  {
    defaultMessage: 'Monitor Management was not able to be disabled. Please contact support.',
  }
);

const SYNTHETICS_ENABLE_SUCCESS = i18n.translate(
  'xpack.uptime.monitorManagement.syntheticsEnableSuccess',
  {
    defaultMessage: 'Monitor Management enabled successfully.',
  }
);

const SYNTHETICS_DISABLE_SUCCESS = i18n.translate(
  'xpack.uptime.monitorManagement.syntheticsDisableDusccess',
  {
    defaultMessage: 'Monitor Management disabled successfully.',
  }
);

const SYNTHETICS_DISABLED_MESSAGE = i18n.translate(
  'xpack.uptime.monitorManagement.syntheticsDisabled',
  {
    defaultMessage:
      'Monitor Management is currently disabled. Please contact an administrator to enable Monitor Management.',
  }
);

const SYNTHETICS_ENABLE_TOOL_TIP_MESSAGE = i18n.translate(
  'xpack.uptime.monitorManagement.syntheticsToolTip',
  {
    defaultMessage:
      'Enable Monitor Management to create lightweight and real-browser monitors from locations around the world.',
  }
);

const API_KEYS_DISABLED_TOOL_TIP_MESSAGE = i18n.translate(
  'xpack.uptime.monitorManagement.apiKeysDisabledToolTip',
  {
    defaultMessage:
      'API Keys are disabled for this cluster. Monitor Management requires the use of API keys to write back to your Elasticsearch cluster. To enable API keys, please contact an administrator.',
  }
);
