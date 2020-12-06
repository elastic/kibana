/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import {
  BEATS_SYSTEM_ID,
  ELASTICSEARCH_SYSTEM_ID,
  KIBANA_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
  APM_SYSTEM_ID,
} from '../../../common/constants';

const NODES = i18n.translate('xpack.monitoring.alerts.typeLabel.nodes', {
  defaultMessage: 'nodes',
});

const INSTANCES = i18n.translate('xpack.monitoring.alerts.typeLabel.instances', {
  defaultMessage: 'instances',
});

const SERVERS = i18n.translate('xpack.monitoring.alerts.typeLabel.servers', {
  defaultMessage: 'servers',
});

const NODE = i18n.translate('xpack.monitoring.alerts.typeLabel.node', {
  defaultMessage: 'node',
});

const INSTANCE = i18n.translate('xpack.monitoring.alerts.typeLabel.instance', {
  defaultMessage: 'instance',
});

const SERVER = i18n.translate('xpack.monitoring.alerts.typeLabel.server', {
  defaultMessage: 'server',
});

export function getTypeLabelForStackProduct(stackProduct: string, plural: boolean = true) {
  switch (stackProduct) {
    case ELASTICSEARCH_SYSTEM_ID:
    case LOGSTASH_SYSTEM_ID:
      return plural ? NODES : NODE;
    case KIBANA_SYSTEM_ID:
    case BEATS_SYSTEM_ID:
      return plural ? INSTANCES : INSTANCE;
    case APM_SYSTEM_ID:
      return plural ? SERVERS : SERVER;
  }
  return 'n/a';
}
