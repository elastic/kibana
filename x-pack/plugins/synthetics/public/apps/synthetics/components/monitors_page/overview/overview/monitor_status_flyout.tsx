/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

const STATUS = i18n.translate('xpack.synthetics.monitorStatus.statusLabel', {
  defaultMessage: 'Status',
});

const FAILED = i18n.translate('xpack.synthetics.monitorStatus.failedLabel', {
  defaultMessage: 'Failed',
});

const PENDING = i18n.translate('xpack.synthetics.monitorStatus.pendingLabel', {
  defaultMessage: 'Pending',
});

const SUCCESS = i18n.translate('xpack.synthetics.monitorStatus.succeededLabel', {
  defaultMessage: 'Succeeded',
});

const UP = i18n.translate('xpack.synthetics.monitorStatus.upLabel', {
  defaultMessage: 'Up',
});

const DOWN = i18n.translate('xpack.synthetics.monitorStatus.downLabel', {
  defaultMessage: 'Down',
});

export const LABELS = {
  STATUS,
  FAILED,
  PENDING,
  SUCCESS,
  UP,
  DOWN,
};
