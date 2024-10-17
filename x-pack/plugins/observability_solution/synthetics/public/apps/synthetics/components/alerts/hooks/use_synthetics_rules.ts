/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  selectSyntheticsAlerts,
  selectSyntheticsAlertsLoading,
} from '../../../state/alert_rules/selectors';
import { SYNTHETICS_TLS_RULE } from '../../../../../../common/constants/synthetics_alerts';
import {
  selectAlertFlyoutVisibility,
  selectIsNewRule,
  setAlertFlyoutVisible,
} from '../../../state';
import { ClientPluginsStart } from '../../../../../plugin';

export const useSyntheticsRules = (isOpen: boolean) => {
  const dispatch = useDispatch();

  const defaultRules = useSelector(selectSyntheticsAlerts);
  const loading = useSelector(selectSyntheticsAlertsLoading);
  const alertFlyoutVisible = useSelector(selectAlertFlyoutVisibility);
  const isNewRule = useSelector(selectIsNewRule);

  const { triggersActionsUi } = useKibana<ClientPluginsStart>().services;

  const EditAlertFlyout = useMemo(() => {
    const initialRule =
      alertFlyoutVisible === SYNTHETICS_TLS_RULE ? defaultRules?.tlsRule : defaultRules?.statusRule;
    if (!initialRule || isNewRule) {
      return null;
    }
    return triggersActionsUi.getEditRuleFlyout({
      onClose: () => dispatch(setAlertFlyoutVisible(null)),
      initialRule,
    });
  }, [
    alertFlyoutVisible,
    defaultRules?.tlsRule,
    defaultRules?.statusRule,
    isNewRule,
    triggersActionsUi,
    dispatch,
  ]);

  const NewRuleFlyout = useMemo(() => {
    if (!isNewRule || !alertFlyoutVisible) {
      return null;
    }
    return triggersActionsUi.getAddRuleFlyout({
      consumer: 'uptime',
      ruleTypeId: alertFlyoutVisible,
      onClose: () => dispatch(setAlertFlyoutVisible(null)),
      initialValues: {
        name:
          alertFlyoutVisible === SYNTHETICS_TLS_RULE
            ? i18n.translate('xpack.synthetics.alerting.defaultRuleName.tls', {
                defaultMessage: 'Synthetics monitor TLS rule',
              })
            : i18n.translate('xpack.synthetics.alerting.defaultRuleName', {
                defaultMessage: 'Synthetics monitor status rule',
              }),
      },
    });
  }, [isNewRule, triggersActionsUi, dispatch, alertFlyoutVisible]);

  return useMemo(
    () => ({ loading, EditAlertFlyout, NewRuleFlyout }),
    [EditAlertFlyout, loading, NewRuleFlyout]
  );
};
