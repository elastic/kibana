/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexItem, EuiFlexGroup, EuiToolTip, EuiSwitch } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLocations } from './hooks/use_locations';
import { ClientPluginsSetup, ClientPluginsStart } from '../../../plugin';
import { kibanaService } from '../../state/kibana_service';
import { MONITOR_ADD_ROUTE } from '../../../../common/constants';
import { useEnablement } from './hooks/use_enablement';
import { useSyntheticsServiceAllowed } from './hooks/use_service_allowed';

export const AddMonitorBtn = () => {
  const history = useHistory();
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const {
    error,
    loading: enablementLoading,
    enablement,
    disableSynthetics,
    enableSynthetics,
    totalMonitors,
  } = useEnablement();
  const { isEnabled, canEnable, areApiKeysEnabled } = enablement || {};

  const { locations } = useLocations();

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
      disableSynthetics();
    } else {
      setIsEnabling(true);
      enableSynthetics();
    }
  };

  const getShowSwitch = () => {
    if (isEnabled) {
      return canEnable;
    } else if (!isEnabled) {
      return canEnable && (totalMonitors || 0) > 0;
    }
  };

  const getSwitchToolTipContent = () => {
    if (!isEnabled) {
      return SYNTHETICS_ENABLE_TOOL_TIP_MESSAGE;
    } else if (isEnabled) {
      return SYNTHETICS_DISABLE_TOOL_TIP_MESSAGE;
    } else if (!areApiKeysEnabled) {
      return API_KEYS_DISABLED_TOOL_TIP_MESSAGE;
    } else {
      return '';
    }
  };

  const { isAllowed, loading: allowedLoading } = useSyntheticsServiceAllowed();

  const loading = allowedLoading || enablementLoading;

  const kServices = useKibana<ClientPluginsStart>().services;

  const canSave: boolean = !!kServices?.application?.capabilities.uptime.save;

  const canSaveIntegrations: boolean =
    !!kServices?.fleet?.authz.integrations.writeIntegrationPolicies;

  const isCloud = useKibana<ClientPluginsSetup>().services?.cloud?.isCloudEnabled;

  const canSavePrivate: boolean = Boolean(isCloud) || canSaveIntegrations;

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem style={{ alignItems: 'flex-end' }} grow={false}>
        {getShowSwitch() && !loading && (
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
        {getShowSwitch() && loading && (
          <EuiSwitch
            checked={Boolean(isEnabled)}
            label={SYNTHETICS_ENABLE_LABEL}
            disabled={true}
            onChange={() => {}}
          />
        )}
      </EuiFlexItem>
      <EuiFlexItem style={{ alignItems: 'flex-end' }} grow={false}>
        <EuiToolTip
          content={
            !isEnabled && !canEnable
              ? SYNTHETICS_DISABLED_MESSAGE
              : !canSavePrivate
              ? PRIVATE_LOCATIONS_NOT_ALLOWED_MESSAGE
              : ''
          }
        >
          <EuiButton
            isLoading={loading}
            fill
            isDisabled={
              !canSave || !isEnabled || !isAllowed || !canSavePrivate || locations.length === 0
            }
            iconType="plus"
            data-test-subj="syntheticsAddMonitorBtn"
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

const PRIVATE_LOCATIONS_NOT_ALLOWED_MESSAGE = i18n.translate(
  'xpack.synthetics.monitorManagement.privateLocationsNotAllowedMessage',
  {
    defaultMessage:
      'You do not have permission to add monitors to private locations. Contact your administrator to request access.',
  }
);

const ADD_MONITOR_LABEL = i18n.translate('xpack.synthetics.monitorManagement.addMonitorLabel', {
  defaultMessage: 'Add monitor',
});

const SYNTHETICS_ENABLE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.syntheticsEnableLabel',
  {
    defaultMessage: 'Enable',
  }
);

const SYNTHETICS_ENABLE_FAILURE = i18n.translate(
  'xpack.synthetics.monitorManagement.syntheticsEnabledFailure',
  {
    defaultMessage: 'Monitor Management was not able to be enabled. Please contact support.',
  }
);

const SYNTHETICS_DISABLE_FAILURE = i18n.translate(
  'xpack.synthetics.monitorManagement.syntheticsDisabledFailure',
  {
    defaultMessage: 'Monitor Management was not able to be disabled. Please contact support.',
  }
);

const SYNTHETICS_ENABLE_SUCCESS = i18n.translate(
  'xpack.synthetics.monitorManagement.syntheticsEnableSuccess',
  {
    defaultMessage: 'Monitor Management enabled successfully.',
  }
);

const SYNTHETICS_DISABLE_SUCCESS = i18n.translate(
  'xpack.synthetics.monitorManagement.syntheticsDisabledSuccess',
  {
    defaultMessage: 'Monitor Management disabled successfully.',
  }
);

const SYNTHETICS_DISABLED_MESSAGE = i18n.translate(
  'xpack.synthetics.monitorManagement.syntheticsDisabled',
  {
    defaultMessage:
      'Monitor Management is currently disabled. Please contact an administrator to enable Monitor Management.',
  }
);

const SYNTHETICS_ENABLE_TOOL_TIP_MESSAGE = i18n.translate(
  'xpack.synthetics.monitorManagement.syntheticsEnableToolTip',
  {
    defaultMessage:
      'Enable Monitor Management to create lightweight and real-browser monitors from locations around the world.',
  }
);

const SYNTHETICS_DISABLE_TOOL_TIP_MESSAGE = i18n.translate(
  'xpack.synthetics.monitorManagement.syntheticsDisableToolTip',
  {
    defaultMessage:
      'Disabling Monitor Management will immediately stop the execution of monitors in all test locations and prevent the creation of new monitors.',
  }
);

const API_KEYS_DISABLED_TOOL_TIP_MESSAGE = i18n.translate(
  'xpack.synthetics.monitorManagement.apiKeysDisabledToolTip',
  {
    defaultMessage:
      'API Keys are disabled for this cluster. Monitor Management requires the use of API keys to write back to your Elasticsearch cluster. To enable API keys, please contact an administrator.',
  }
);
