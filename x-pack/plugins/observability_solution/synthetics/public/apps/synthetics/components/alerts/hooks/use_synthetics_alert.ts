/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SYNTHETICS_TLS_RULE } from '../../../../../../common/constants/synthetics_alerts';
import { ClientPluginsStart } from '../../../../../plugin';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { selectAlertFlyoutVisibility, setAlertFlyoutVisible } from '../../../state';
import {
  enableDefaultAlertingSilentlyAction,
  getDefaultAlertingAction,
} from '../../../state/alert_rules';
import {
  selectSyntheticsAlerts,
  selectSyntheticsAlertsLoading,
} from '../../../state/alert_rules/selectors';

export const useSyntheticsAlert = (isOpen: boolean) => {
  const dispatch = useDispatch();

  const defaultRules = useSelector(selectSyntheticsAlerts);
  const loading = useSelector(selectSyntheticsAlertsLoading);
  const alertFlyoutVisible = useSelector(selectAlertFlyoutVisibility);

  const { canSave } = useSyntheticsSettingsContext();

  const getOrCreateAlerts = useCallback(() => {
    if (canSave) {
      dispatch(enableDefaultAlertingSilentlyAction.get());
    } else {
      dispatch(getDefaultAlertingAction.get());
    }
  }, [canSave, dispatch]);

  useEffect(() => {
    if (!defaultRules) {
      // on initial load we prioritize loading the app
      setTimeout(() => {
        getOrCreateAlerts();
      }, 1000);
    } else {
      getOrCreateAlerts();
    }
    // we don't want to run this on defaultRules change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isOpen]);

  const { triggersActionsUi } = useKibana<ClientPluginsStart>().services;

  const EditAlertFlyout = useMemo(() => {
    if (!defaultRules) {
      return null;
    }
    return triggersActionsUi.getEditRuleFlyout({
      onClose: () => dispatch(setAlertFlyoutVisible(null)),
      hideInterval: true,
      initialRule:
        alertFlyoutVisible === SYNTHETICS_TLS_RULE ? defaultRules.tlsRule : defaultRules.statusRule,
    });
  }, [defaultRules, dispatch, triggersActionsUi, alertFlyoutVisible]);

  return useMemo(() => ({ loading, EditAlertFlyout }), [EditAlertFlyout, loading]);
};
