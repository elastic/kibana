/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { InMemoryConnector } from '../../types';
import { AlertHistoryEsIndexConnectorId, AlertHistoryDefaultIndexName } from '../../../common';

const EsIndexActionTypeId = '.index';
export function getAlertHistoryEsIndex(): Readonly<InMemoryConnector> {
  return Object.freeze({
    name: i18n.translate('xpack.actions.alertHistoryEsIndexConnector.name', {
      defaultMessage: 'Alert history Elasticsearch index',
    }),
    actionTypeId: EsIndexActionTypeId,
    id: AlertHistoryEsIndexConnectorId,
    isPreconfigured: true,
    isDeprecated: false,
    isSystemAction: false,
    config: {
      index: AlertHistoryDefaultIndexName,
    },
    secrets: {},
  });
}
