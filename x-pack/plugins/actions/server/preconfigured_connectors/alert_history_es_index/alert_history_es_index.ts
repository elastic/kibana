/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import {
  AlertHistoryDefaultIndexName,
  AlertHistoryEsIndexConnectorId,
} from '../../../common/alert_history_schema';
import { ActionTypeId as EsIndexActionTypeId } from '../../builtin_action_types/es_index';
import type { PreConfiguredAction } from '../../types';

export function getAlertHistoryEsIndex(): Readonly<PreConfiguredAction> {
  return Object.freeze({
    name: i18n.translate('xpack.actions.alertHistoryEsIndexConnector.name', {
      defaultMessage: 'Alert history Elasticsearch index',
    }),
    actionTypeId: EsIndexActionTypeId,
    id: AlertHistoryEsIndexConnectorId,
    isPreconfigured: true,
    config: {
      index: AlertHistoryDefaultIndexName,
    },
    secrets: {},
  });
}
