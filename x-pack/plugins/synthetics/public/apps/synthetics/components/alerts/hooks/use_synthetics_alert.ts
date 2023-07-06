/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useMemo, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { SYNTHETICS_TLS_RULE } from '../../../../../../common/constants/synthetics_alerts';
import { selectAlertFlyoutVisibility, setAlertFlyoutVisible } from '../../../state';
import { enableDefaultAlertingAPI } from '../../../state/alert_rules/api';
import { ClientPluginsStart } from '../../../../../plugin';

export const useSyntheticsAlert = (isOpen: boolean) => {
  const dispatch = useDispatch();

  const [defaultRules, setAlert] = useState<{ statusRule: Rule; tlsRule: Rule } | null>(null);
  const alertFlyoutVisible = useSelector(selectAlertFlyoutVisibility);

  const { data, loading } = useFetcher(() => {
    if (isOpen) {
      return enableDefaultAlertingAPI();
    }
  }, [isOpen]);

  useEffect(() => {
    if (data) {
      setAlert(data);
    }
  }, [data]);

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
