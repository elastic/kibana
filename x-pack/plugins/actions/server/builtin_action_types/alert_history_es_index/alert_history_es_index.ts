/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { PreConfiguredAction } from '../../types';
import { ActionTypeId as EsIndexActionTypeId } from '../es_index';
import { AlertHistoryEsIndexConnectorId } from '../../../common';
import { getInitialIndexName } from './types';

export function getAlertHistoryEsIndex(): Readonly<PreConfiguredAction> {
  return Object.freeze({
    name: i18n.translate('xpack.actions.alertHistoryEsIndexConnector.name', {
      defaultMessage: 'Alert History ES Index',
    }),
    actionTypeId: EsIndexActionTypeId,
    id: AlertHistoryEsIndexConnectorId,
    isPreconfigured: true,
    config: {
      index: getInitialIndexName,
    },
    secrets: {},
  });
}
