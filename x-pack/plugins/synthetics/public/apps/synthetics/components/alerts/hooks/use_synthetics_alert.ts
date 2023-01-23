/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { useDispatch } from 'react-redux';
import { useEffect, useMemo, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { setAlertFlyoutVisible } from '../../../state';
import { enableDefaultAlertingAPI } from '../../../state/alert_rules/api';
import { ClientPluginsStart } from '../../../../../plugin';

export const useSyntheticsAlert = (isOpen: boolean) => {
  const dispatch = useDispatch();

  const [alert, setAlert] = useState<Rule | null>(null);

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
    if (!alert) {
      return null;
    }
    return triggersActionsUi.getEditAlertFlyout({
      onClose: () => dispatch(setAlertFlyoutVisible(false)),
      initialRule: alert,
    });
  }, [alert, dispatch, triggersActionsUi]);

  return useMemo(() => ({ loading, EditAlertFlyout }), [EditAlertFlyout, loading]);
};
