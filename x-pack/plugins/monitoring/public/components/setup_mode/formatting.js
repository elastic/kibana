/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { capitalize } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  APM_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
  ELASTICSEARCH_SYSTEM_ID,
  KIBANA_SYSTEM_ID,
  BEATS_SYSTEM_ID,
} from '../../../common/constants';

const NODE_IDENTIFIER_SINGULAR = i18n.translate('xpack.monitoring.setupMode.node', {
  defaultMessage: `node`,
});
const NODE_IDENTIFIER_PLURAL = i18n.translate('xpack.monitoring.setupMode.nodes', {
  defaultMessage: `nodes`,
});
const INSTANCE_IDENTIFIER_SINGULAR = i18n.translate('xpack.monitoring.setupMode.instance', {
  defaultMessage: `instance`,
});
const INSTANCE_IDENTIFIER_PLURAL = i18n.translate('xpack.monitoring.setupMode.instances', {
  defaultMessage: `instances`,
});
const SERVER_IDENTIFIER_SINGULAR = i18n.translate('xpack.monitoring.setupMode.server', {
  defaultMessage: `server`,
});
const SERVER_IDENTIFIER_PLURAL = i18n.translate('xpack.monitoring.setupMode.servers', {
  defaultMessage: `servers`,
});

export function formatProductName(productName) {
  if (productName === APM_SYSTEM_ID) {
    return productName.toUpperCase();
  }
  return capitalize(productName);
}

const PRODUCTS_THAT_USE_NODES = [LOGSTASH_SYSTEM_ID, ELASTICSEARCH_SYSTEM_ID];
const PRODUCTS_THAT_USE_INSTANCES = [KIBANA_SYSTEM_ID, BEATS_SYSTEM_ID];
export function getIdentifier(productName, usePlural = false) {
  if (PRODUCTS_THAT_USE_INSTANCES.includes(productName)) {
    return usePlural ? INSTANCE_IDENTIFIER_PLURAL : INSTANCE_IDENTIFIER_SINGULAR;
  }
  if (PRODUCTS_THAT_USE_NODES.includes(productName)) {
    return usePlural ? NODE_IDENTIFIER_PLURAL : NODE_IDENTIFIER_SINGULAR;
  }
  if (productName === APM_SYSTEM_ID) {
    return usePlural ? SERVER_IDENTIFIER_PLURAL : SERVER_IDENTIFIER_SINGULAR;
  }
  return productName;
}
