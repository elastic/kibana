/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { AlertingConnectorFeatureId } from '@kbn/actions-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { loadActionTypes } from '../lib/action_connector_api';

export const useLoadActionTypesQuery = () => {
  const {
    http,
    actionTypeRegistry,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = () => {
    return loadActionTypes({ http, featureId: AlertingConnectorFeatureId });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.unableToLoadConnectorTypesMessage',
        { defaultMessage: 'Unable to load connector types' }
      )
    );
  };

  const { data = [] } = useQuery({
    queryKey: ['loadActionTypes'],
    queryFn,
    onError: onErrorFn,
  });

  const sortedResult = data
    .filter(({ id }) => actionTypeRegistry.has(id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    actionTypes: sortedResult,
  };
};
