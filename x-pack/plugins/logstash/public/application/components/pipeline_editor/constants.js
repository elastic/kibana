/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PIPELINE_EDITOR = {
  DELETE_PIPELINE_MODAL_MESSAGE: i18n.translate('xpack.logstash.deletePipelineModalMessage', {
    defaultMessage: 'You cannot recover a deleted pipeline.',
  }),
  ID_REQUIRED_ERR_MSG: i18n.translate('xpack.logstash.pipelineIdRequiredMessage', {
    defaultMessage: 'Pipeline ID is required',
  }),
  ID_FORMAT_ERR_MSG: i18n.translate('xpack.logstash.idFormatErrorMessage', {
    defaultMessage:
      'Pipeline ID must begin with a letter or underscore and contain only letters, underscores, dashes, and numbers',
  }),
  ECS_COMPATIBILITIES: [
    {
      'data-test-subj': 'selectECS-inherit',
      text: i18n.translate('xpack.logstash.ecsCompatibilities.unspecifiedLabel', {
        defaultMessage: 'inherit',
      }),
      value: null,
    },
    {
      'data-test-subj': 'selectECS-disabled',
      text: i18n.translate('xpack.logstash.ecsCompatibilities.disabledLabel', {
        defaultMessage: 'disabled (no ECS-related operations)',
      }),
      value: 'disabled',
    },
    {
      'data-test-subj': 'selectECS-v1',
      text: i18n.translate('xpack.logstash.ecsCompatibilities.v1Label', {
        defaultMessage: 'ECS 1.x (aligns with Elastic Stack 7.x)',
      }),
      value: 'v1',
    },
    {
      'data-test-subj': 'selectECS-v8',
      text: i18n.translate('xpack.logstash.ecsCompatibilities.v8Label', {
        defaultMessage: 'ECS 8.x (aligns with Elastic Stack 8.x)',
      }),
      value: 'v8',
    },
  ],
  QUEUE_TYPES: [
    {
      'data-test-subj': 'selectQueueType-memory',
      text: i18n.translate('xpack.logstash.queueTypes.memoryLabel', {
        defaultMessage: 'memory',
      }),
      value: 'memory',
    },
    {
      'data-test-subj': 'selectQueueType-persisted',
      text: i18n.translate('xpack.logstash.queueTypes.persistedLabel', {
        defaultMessage: 'persisted',
      }),
      value: 'persisted',
    },
  ],
  UNITS: [
    {
      'data-test-subj': 'selectQueueMaxBytesUnits-b',
      text: i18n.translate('xpack.logstash.units.bytesLabel', {
        defaultMessage: 'bytes',
      }),
      value: 'b',
    },
    {
      'data-test-subj': 'selectQueueMaxBytesUnits-kb',
      text: i18n.translate('xpack.logstash.units.kilobytesLabel', {
        defaultMessage: 'kilobytes',
      }),
      value: 'kb',
    },
    {
      'data-test-subj': 'selectQueueMaxBytesUnits-mb',
      text: i18n.translate('xpack.logstash.units.megabytesLabel', {
        defaultMessage: 'megabytes',
      }),
      value: 'mb',
    },
    {
      'data-test-subj': 'selectQueueMaxBytesUnits-gb',
      text: i18n.translate('xpack.logstash.units.gigabytesLabel', {
        defaultMessage: 'gigabytes',
      }),
      value: 'gb',
    },
    {
      'data-test-subj': 'selectQueueMaxBytesUnits-tb',
      text: i18n.translate('xpack.logstash.units.terabytesLabel', {
        defaultMessage: 'terabytes',
      }),
      value: 'tb',
    },
    {
      'data-test-subj': 'selectQueueMaxBytesUnits-pb',
      text: i18n.translate('xpack.logstash.units.petabytesLabel', {
        defaultMessage: 'petabytes',
      }),
      value: 'pb',
    },
  ],
};
