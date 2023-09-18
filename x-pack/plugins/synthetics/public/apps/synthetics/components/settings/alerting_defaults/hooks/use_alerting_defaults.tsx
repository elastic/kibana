/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useDispatch, useSelector } from 'react-redux';
import React, { useEffect } from 'react';
import { EuiIcon } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ClientPluginsStart } from '../../../../../../plugin';
import { selectDynamicSettings } from '../../../../state/settings/selectors';
import { fetchActionTypes } from '../../../../state/settings/api';
import { getConnectorsAction } from '../../../../state/settings/actions';

export const useAlertingDefaults = () => {
  const { data: actionTypes } = useFetcher(() => fetchActionTypes(), []);
  const { connectors, connectorsLoading, loading, settings } = useSelector(selectDynamicSettings);
  const { defaultConnectors } = settings || {};
  const { actionTypeRegistry } = useKibana<ClientPluginsStart>().services.triggersActionsUi;

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getConnectorsAction.get());
  }, [dispatch]);

  const options = (connectors ?? [])
    .filter((action) => (actionTypes ?? []).find((type) => type.id === action.actionTypeId))
    .map((connectorAction) => ({
      value: connectorAction.id,
      label: connectorAction.name,
      'data-test-subj': connectorAction.name,
      prepend: (
        <EuiIcon
          type={actionTypeRegistry.get(connectorAction.actionTypeId as string).iconClass}
          size="s"
        />
      ),
    }));

  return {
    options,
    actionTypes,
    connectors,
    connectorsLoading,
    settingsLoading: loading,
    defaultConnectors,
  };
};
