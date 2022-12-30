/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { selectDynamicSettings } from '../../../../state/settings/selectors';
import { fetchActionTypes } from '../../../../state/settings/api';
import { getConnectorsAction } from '../../../../state/settings/actions';

export const useAlertingDefaults = () => {
  const { data: actionTypes } = useFetcher(() => fetchActionTypes(), []);
  const { connectors } = useSelector(selectDynamicSettings);

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
    }));

  return {
    options,
    actionTypes,
    connectors,
  };
};
