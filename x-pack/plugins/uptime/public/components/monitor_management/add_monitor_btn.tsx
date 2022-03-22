/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiSwitch, EuiFlexItem, EuiFlexGroup, EuiToolTip } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { MONITOR_ADD_ROUTE } from '../../../common/constants';
import { getSyntheticsEnablement, disableSynthetics, enableSynthetics } from '../../state/actions';
import { monitorManagementListSelector } from '../../state/selectors';

export const AddMonitorBtn = ({ isDisabled }: { isDisabled: boolean }) => {
  const history = useHistory();

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

  const handleSwitch = () => {
    if (isEnabled) {
      dispatch(disableSynthetics());
    } else {
      dispatch(enableSynthetics());
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
          <EuiToolTip content={isEnabled ? '' : SYNTHETICS_ENABLE_TOOL_TIP_MESSAGE}>
            <EuiSwitch
              checked={Boolean(isEnabled)}
              label={SYNTHETICS_ENABLE_LABEL}
              disabled={loading}
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
  'xpack.uptime.monitorManagement.syntheticsDisabled',
  {
    defaultMessage: 'Enable',
  }
);

const SYNTHETICS_DISABLED_MESSAGE = i18n.translate(
  'xpack.uptime.monitorManagement.syntheticsDisabled',
  {
    defaultMessage:
      'Monitor Management is currently disabled. Please contact an administrator to enable Monitor Management. Learn more: ',
  }
);

const SYNTHETICS_ENABLE_TOOL_TIP_MESSAGE = i18n.translate(
  'xpack.uptime.monitorManagement.syntheticsToolTip',
  {
    defaultMessage:
      'Enable Monitor Management to create lightweight and real-browser monitors from locations around the world. Learn more: ',
  }
);
