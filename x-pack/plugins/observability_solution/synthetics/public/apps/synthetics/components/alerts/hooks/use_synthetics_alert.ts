/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { selectDynamicSettings } from '../../../state/settings';
import { useSyntheticsSettingsContext } from '../../../contexts';
import {
  selectSyntheticsAlerts,
  selectSyntheticsAlertsLoading,
} from '../../../state/alert_rules/selectors';
import {
  enableDefaultAlertingSilentlyAction,
  getDefaultAlertingAction,
} from '../../../state/alert_rules';
import { SYNTHETICS_TLS_RULE } from '../../../../../../common/constants/synthetics_alerts';
import {
  selectAlertFlyoutVisibility,
  selectIsNewrule,
  selectMonitorListState,
  setAlertFlyoutVisible,
} from '../../../state';
import { ClientPluginsStart } from '../../../../../plugin';

export const useSyntheticsAlert = (isOpen: boolean) => {
  const dispatch = useDispatch();

  const defaultRules = useSelector(selectSyntheticsAlerts);
  const loading = useSelector(selectSyntheticsAlertsLoading);
  const alertFlyoutVisible = useSelector(selectAlertFlyoutVisibility);
  const isNewRule = useSelector(selectIsNewrule);
  const { settings } = useSelector(selectDynamicSettings);

  const { canSave } = useSyntheticsSettingsContext();

  const { loaded, data: monitors } = useSelector(selectMonitorListState);

  const hasMonitors = loaded && monitors.absoluteTotal && monitors.absoluteTotal > 0;
  const defaultRulesEnabled = settings && (settings?.defaultRulesEnabled ?? true);

  const getOrCreateAlerts = useCallback(() => {
    if (canSave) {
      dispatch(enableDefaultAlertingSilentlyAction.get());
    } else {
      dispatch(getDefaultAlertingAction.get());
    }
  }, [canSave, dispatch]);

  useEffect(() => {
    if (hasMonitors && defaultRulesEnabled) {
      if (!defaultRules) {
        // on initial load we prioritize loading the app
        setTimeout(() => {
          getOrCreateAlerts();
        }, 1000);
      } else {
        getOrCreateAlerts();
      }
    }
    // we don't want to run this on defaultRules change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isOpen, hasMonitors, defaultRulesEnabled]);

  const { triggersActionsUi } = useKibana<ClientPluginsStart>().services;

  const EditAlertFlyout = useMemo(() => {
    if (!defaultRules || isNewRule) {
      return null;
    }
    return triggersActionsUi.getEditRuleFlyout({
      onClose: () => dispatch(setAlertFlyoutVisible(null)),
      hideInterval: true,
      initialRule:
        alertFlyoutVisible === SYNTHETICS_TLS_RULE ? defaultRules.tlsRule : defaultRules.statusRule,
    });
  }, [defaultRules, isNewRule, triggersActionsUi, alertFlyoutVisible, dispatch]);

  const NewRuleFlyout = useMemo(() => {
    if (!defaultRules || !isNewRule || !alertFlyoutVisible) {
      return null;
    }
    return triggersActionsUi.getAddRuleFlyout({
      consumer: 'uptime',
      ruleTypeId: alertFlyoutVisible,
      onClose: () => dispatch(setAlertFlyoutVisible(null)),
    });
  }, [defaultRules, isNewRule, triggersActionsUi, dispatch, alertFlyoutVisible]);

  return useMemo(
    () => ({ loading, EditAlertFlyout, NewRuleFlyout }),
    [EditAlertFlyout, loading, NewRuleFlyout]
  );
};
