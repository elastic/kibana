/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const STATE_NAMES = {
  running: i18n.translate('xpack.infra.metrics.nodeDetails.processes.stateRunning', {
    defaultMessage: 'Running',
  }),
  sleeping: i18n.translate('xpack.infra.metrics.nodeDetails.processes.stateSleeping', {
    defaultMessage: 'Sleeping',
  }),
  dead: i18n.translate('xpack.infra.metrics.nodeDetails.processes.stateDead', {
    defaultMessage: 'Dead',
  }),
  stopped: i18n.translate('xpack.infra.metrics.nodeDetails.processes.stateStopped', {
    defaultMessage: 'Stopped',
  }),
  idle: i18n.translate('xpack.infra.metrics.nodeDetails.processes.stateIdle', {
    defaultMessage: 'Idle',
  }),
  zombie: i18n.translate('xpack.infra.metrics.nodeDetails.processes.stateZombie', {
    defaultMessage: 'Zombie',
  }),
  unknown: i18n.translate('xpack.infra.metrics.nodeDetails.processes.stateUnknown', {
    defaultMessage: 'Unknown',
  }),
};

export const STATE_ORDER = ['running', 'sleeping', 'stopped', 'idle', 'dead', 'zombie', 'unknown'];
